import { NextResponse } from 'next/server';
import { searchRathenaDb } from '../../../lib/rathenaSearch';

export async function GET(request) {
  try {
    const url = request.nextUrl || new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '60', 10);

    if (!query.trim()) {
      return NextResponse.json({ success: true, count: 0, items: [] });
    }

    const items = searchRathenaDb(query, limit);

    return NextResponse.json({
      success: true,
      count: items.length,
      items: items
    });
  } catch (error) {
    console.error('API /api/search Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
