import { NextRequest, NextResponse } from 'next/server';
import { getAllActiveProducts } from '@/lib/server/products';

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const excluded = new Set((params.get('exclude') || '').split(',').map((id) => id.trim()).filter(Boolean));
    const requestedLimit = Number(params.get('limit') || 4);
    const limit = Math.max(1, Math.min(8, Number.isFinite(requestedLimit) ? requestedLimit : 4));
    const products = (await getAllActiveProducts())
      .filter((product) => !excluded.has(String(product.id)) && Number(product.totalStock || 0) > 0)
      .sort((a, b) => {
        if (Boolean(b.isBestseller) !== Boolean(a.isBestseller)) return b.isBestseller ? 1 : -1;
        const soldB = Number(String(b.sold || '').replace(/\D/g, '') || 0);
        const soldA = Number(String(a.sold || '').replace(/\D/g, '') || 0);
        if (soldB !== soldA) return soldB - soldA;
        return Number(b.rating || 0) - Number(a.rating || 0) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      })
      .slice(0, limit);
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, products: [], message: error.message }, { status: 500 });
  }
}
