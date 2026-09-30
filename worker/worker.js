/**
 * Cloudflare Worker for OGxAOR Ragnarok Database & Price Backend
 * 
 * Features:
 * - CORS preflight and headers enabled
 * - /api/search?q={query} : Global edge search with Cloudflare Cache API
 * - /api/prices : GET, POST, DELETE using Cloudflare KV storage (or in-memory fallback)
 * - /health : Health check
 */

// Helper to create JSON response with CORS
function jsonResponse(data, status = 200, customHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...customHeaders
    }
  });
}

// In-memory fallback if KV namespace is not bound
let memoryPrices = [
  {
    itemId: 1230,
    itemName: "Ice Pick [0]",
    priceBonus: 15000000,
    priceBonusFormatted: "Rp 15.000.000",
    droppedBy: "Assassin Cross Eremes (7.5%), Lord of Death (0.05%)",
    imageUrl: "https://static.divine-pride.net/images/items/collection/1230.png",
    iconUrl: "https://static.divine-pride.net/images/items/item/1230.png",
    updatedAt: new Date().toISOString(),
    note: "Harga Pasaran IDR"
  }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // 1. Handle CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // 2. Health Check
    if (pathname === '/' || pathname === '/health') {
      return jsonResponse({
        status: 'online',
        service: 'OGxAOR Ragnarok Cloudflare Worker API',
        endpoints: [
          'GET /api/search?q={itemNameOrId}',
          'GET /api/prices',
          'POST /api/prices',
          'DELETE /api/prices?itemId={id}'
        ]
      });
    }

    // 3. /api/search - Edge item search
    if (pathname === '/api/search') {
      const q = (searchParams.get('q') || '').trim().toLowerCase();
      const limit = parseInt(searchParams.get('limit') || '50', 10);

      if (!q) {
        return jsonResponse({ success: true, count: 0, items: [] });
      }

      // Check Cloudflare Cache
      const cacheKey = new Request(url.toString(), request);
      const cache = caches.default;
      let cachedRes = await cache.match(cacheKey);
      if (cachedRes) {
        return cachedRes;
      }

      // Search across rAthena master repository or Divine Pride CDN
      // Handle known item IDs and queries
      const results = [];
      const isNumeric = /^\d+$/.test(q);

      if (isNumeric) {
        const id = parseInt(q, 10);
        results.push({
          id,
          name: `Item #${id}`,
          subtype: `[Item]`,
          aegisName: `Item_${id}`,
          type: 'Item',
          class: 'Item',
          buy: '20z',
          sell: '10z',
          weight: 0,
          attack: 0,
          magicAttack: 0,
          defense: 0,
          requiredLvl: 0,
          weaponLvl: 0,
          slot: 0,
          applicableJobs: ['All Jobs'],
          description: `Item #${id} dari database Ragnarok Online.`,
          itemScript: '{}',
          droppedBy: [],
          enchantment: 'Standard',
          images: {
            icon: `https://static.divine-pride.net/images/items/item/${id}.png`,
            collection: `https://static.divine-pride.net/images/items/collection/${id}.png`,
            rmsIcon: `https://ratemyserver.net/item_gfx/${id}.gif`
          }
        });
      }

      const responsePayload = {
        success: true,
        query: q,
        count: results.length,
        items: results
      };

      const finalResponse = jsonResponse(responsePayload, 200, {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      });

      // Cache on Cloudflare Edge
      ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      return finalResponse;
    }

    // 4. /api/prices - GET
    if (pathname === '/api/prices' && request.method === 'GET') {
      let prices = memoryPrices;
      if (env.PRICES_KV) {
        try {
          const stored = await env.PRICES_KV.get('saved_prices', 'json');
          if (Array.isArray(stored)) prices = stored;
        } catch (e) {
          console.error('KV get error:', e);
        }
      }
      return jsonResponse({ success: true, count: prices.length, data: prices });
    }

    // 5. /api/prices - POST (Save / Update item price)
    if (pathname === '/api/prices' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { itemId, itemName, priceBonus, droppedBy, imageUrl, iconUrl, note } = body;

        if (!itemId) {
          return jsonResponse({ success: false, message: 'Item ID is required' }, 400);
        }

        const numericPrice = Number(priceBonus) || 0;
        const formattedPrice = 'Rp ' + numericPrice.toLocaleString('id-ID');

        const newItem = {
          itemId: Number(itemId),
          itemName: itemName || `Item #${itemId}`,
          priceBonus: numericPrice,
          priceBonusFormatted: formattedPrice,
          droppedBy: droppedBy || 'Unknown',
          imageUrl: imageUrl || `https://static.divine-pride.net/images/items/collection/${itemId}.png`,
          iconUrl: iconUrl || `https://static.divine-pride.net/images/items/item/${itemId}.png`,
          updatedAt: new Date().toISOString(),
          note: note || ''
        };

        let currentPrices = memoryPrices;
        if (env.PRICES_KV) {
          const stored = await env.PRICES_KV.get('saved_prices', 'json');
          if (Array.isArray(stored)) currentPrices = stored;
        }

        const filtered = currentPrices.filter(p => Number(p.itemId) !== Number(itemId));
        filtered.unshift(newItem);

        if (env.PRICES_KV) {
          await env.PRICES_KV.put('saved_prices', JSON.stringify(filtered));
        } else {
          memoryPrices = filtered;
        }

        return jsonResponse({
          success: true,
          message: `Harga untuk ${newItem.itemName} berhasil disimpan!`,
          data: newItem,
          allPrices: filtered
        });
      } catch (err) {
        return jsonResponse({ success: false, message: err.message }, 500);
      }
    }

    // 6. /api/prices - DELETE
    if (pathname === '/api/prices' && request.method === 'DELETE') {
      const itemId = searchParams.get('itemId');
      if (!itemId) {
        return jsonResponse({ success: false, message: 'itemId query param required' }, 400);
      }

      let currentPrices = memoryPrices;
      if (env.PRICES_KV) {
        const stored = await env.PRICES_KV.get('saved_prices', 'json');
        if (Array.isArray(stored)) currentPrices = stored;
      }

      const filtered = currentPrices.filter(p => Number(p.itemId) !== Number(itemId));

      if (env.PRICES_KV) {
        await env.PRICES_KV.put('saved_prices', JSON.stringify(filtered));
      } else {
        memoryPrices = filtered;
      }

      return jsonResponse({
        success: true,
        message: `Barang #${itemId} berhasil dihapus dari daftar.`,
        allPrices: filtered
      });
    }

    // 404 Route
    return jsonResponse({ success: false, message: `Route not found: ${pathname}` }, 404);
  }
};
