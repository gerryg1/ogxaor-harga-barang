import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let inMemoryPrices = null;

function getPricesFilePath() {
  // On Vercel / AWS Lambda, use writable /tmp directory
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpPath = path.join('/tmp', 'saved_prices.json');
    if (!fs.existsSync(tmpPath)) {
      try {
        const defaultData = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'saved_prices.json'), 'utf-8');
        fs.writeFileSync(tmpPath, defaultData);
      } catch (e) {
        try { fs.writeFileSync(tmpPath, '[]'); } catch (_) {}
      }
    }
    return tmpPath;
  }
  return path.join(process.cwd(), 'src', 'data', 'saved_prices.json');
}

function readPricesFromFile() {
  try {
    const filePath = getPricesFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data || '[]');
      inMemoryPrices = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('File read warning (fallback to in-memory):', err.message);
  }
  return inMemoryPrices || [];
}

function writePricesToFile(prices) {
  inMemoryPrices = prices;
  try {
    const filePath = getPricesFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(prices, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('File write warning on serverless environment (using in-memory):', err.message);
    return false;
  }
}

// GET /api/prices
export async function GET() {
  const prices = readPricesFromFile();
  return NextResponse.json({
    success: true,
    count: prices.length,
    data: prices
  });
}

// POST /api/prices
export async function POST(request) {
  try {
    const body = await request.json();
    const { itemId, itemName, priceBonus, droppedBy, imageUrl, iconUrl, note } = body;

    if (!itemId) {
      return NextResponse.json({ success: false, message: 'Item ID is required' }, { status: 400 });
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

    const currentPrices = readPricesFromFile();
    // Filter out existing item with same ID
    const updatedPrices = currentPrices.filter(p => Number(p.itemId) !== Number(itemId));
    // Add to the top
    updatedPrices.unshift(newItem);

    writePricesToFile(updatedPrices);

    return NextResponse.json({
      success: true,
      message: `Harga untuk ${newItem.itemName} berhasil disimpan!`,
      data: newItem,
      allPrices: updatedPrices
    }, { status: 200 });

  } catch (error) {
    console.error('API /api/prices POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/prices
export async function DELETE(request) {
  try {
    const url = request.nextUrl || new URL(request.url);
    const itemId = url.searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ success: false, message: 'itemId param required' }, { status: 400 });
    }

    const currentPrices = readPricesFromFile();
    const updatedPrices = currentPrices.filter(p => Number(p.itemId) !== Number(itemId));
    writePricesToFile(updatedPrices);

    return NextResponse.json({
      success: true,
      message: `Barang #${itemId} berhasil dihapus dari daftar.`,
      allPrices: updatedPrices
    });
  } catch (error) {
    console.error('API /api/prices DELETE Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
