import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRICES_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'saved_prices.json');

function readPricesFromFile() {
  try {
    if (!fs.existsSync(PRICES_FILE_PATH)) {
      fs.writeFileSync(PRICES_FILE_PATH, '[]', 'utf-8');
      return [];
    }
    const data = fs.readFileSync(PRICES_FILE_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading saved_prices.json:', err);
    return [];
  }
}

function writePricesToFile(prices) {
  try {
    fs.mkdirSync(path.dirname(PRICES_FILE_PATH), { recursive: true });
    fs.writeFileSync(PRICES_FILE_PATH, JSON.stringify(prices, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to saved_prices.json:', err);
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
    const formattedPrice = numericPrice.toLocaleString('id-ID') + ' Zeny';

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
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

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
