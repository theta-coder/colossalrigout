import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { POST as applyPromotions } from '@/app/api/promotions/apply/route';
import { defaultShippingSettings } from '@/lib/shipping-policy';

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 100_000) return NextResponse.json({ success: false, message: 'Cart is too large.' }, { status: 413 });
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    if (items.some((item: any) => !Number.isInteger(Number(item.qty)) || Number(item.qty) < 1 || Number(item.qty) > 100)) {
      return NextResponse.json({ success: false, message: 'Invalid cart quantity.' }, { status: 400 });
    }

    const promotionRequest = new NextRequest(new URL('/api/promotions/apply', request.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(request.headers.get('authorization') ? { authorization: request.headers.get('authorization')! } : {}) },
      body: JSON.stringify({ items, couponCode: body.couponCode || null }),
    });
    const promotionResponse = await applyPromotions(promotionRequest);
    const pricing = await promotionResponse.json();
    if (!promotionResponse.ok || !pricing.success) return NextResponse.json(pricing, { status: promotionResponse.status });

    const [variantsSnapshot, imagesSnapshot, colorsSnapshot, sizesSnapshot, shippingSnapshot] = await Promise.all([
      getDocs(collection(db, 'product-variants')),
      getDocs(collection(db, 'product-images')),
      getDocs(collection(db, 'colors')),
      getDocs(collection(db, 'sizes')),
      getDoc(doc(db, 'shipping-policy', 'settings')),
    ]);
    const variants = new Map(variantsSnapshot.docs.map((entry) => [entry.id, entry.data()]));
    const colors = new Map(colorsSnapshot.docs.map((entry) => [entry.id, entry.data()]));
    const sizes = new Map(sizesSnapshot.docs.map((entry) => [entry.id, entry.data()]));
    const imagesByProductColor = new Map<string, Array<{ id: string; role: string; order: number }>>();
    imagesSnapshot.forEach((entry) => {
      const data = entry.data();
      if (!data.productId) return;
      const key = `${data.productId}:${data.colorId || ''}`;
      const list = imagesByProductColor.get(key) || [];
      list.push({ id: entry.id, role: String(data.role || 'gallery'), order: Number(data.order || 0) });
      imagesByProductColor.set(key, list);
    });

    const lines = await Promise.all(pricing.items.map(async (pricedItem: any) => {
      const productId = String(pricedItem.productId || pricedItem.id);
      const productSnapshot = await getDoc(doc(db, 'products', productId));
      if (!productSnapshot.exists()) return null;
      const product = productSnapshot.data();
      const variant = pricedItem.variantId ? variants.get(String(pricedItem.variantId)) : null;
      const colorId = String(variant?.colorId || pricedItem.colorId || '');
      const sizeId = String(variant?.sizeId || pricedItem.sizeId || '');
      const gallery = (imagesByProductColor.get(`${productId}:${colorId}`) || imagesByProductColor.get(`${productId}:`) || [])
        .sort((a, b) => (a.role === 'primary' ? -1 : b.role === 'primary' ? 1 : a.order - b.order));
      return {
        ...pricedItem,
        id: /^\d+$/.test(productId) ? Number(productId) : productId,
        name: String(product.name || pricedItem.name || 'Product'),
        slug: String(product.slug || ''),
        colorId,
        color: String(colors.get(colorId)?.name || variant?.colorName || pricedItem.color || 'Default'),
        sizeId,
        size: String(sizes.get(sizeId)?.code || variant?.sizeName || pricedItem.size || ''),
        img: gallery[0] ? `/api/homepage-image/product/${encodeURIComponent(gallery[0].id)}` : '/product-placeholder.png',
        availableStock: Math.max(0, Number(variant?.availableStock ?? (Number(variant?.stockOnHand || 0) - Number(variant?.reservedStock || 0))) || 0),
        unavailable: product.status === 'draft' || product.status === 'archived' || variant?.active === false,
      };
    }));

    const validLines = lines.filter(Boolean);
    const settings = { ...defaultShippingSettings, ...(shippingSnapshot.exists() ? shippingSnapshot.data() : {}) };
    const discountedSubtotal = Number(pricing.finalSubtotal || 0);
    const freeThreshold = settings.freeShippingEnabled ? Number(settings.freeShippingThreshold || 0) : 0;
    const free = discountedSubtotal === 0 || (freeThreshold > 0 && discountedSubtotal >= freeThreshold);
    const shippingAmount = free ? 0 : settings.flatRateEnabled ? Number(settings.flatRate || 0) : 0;

    return NextResponse.json({
      ...pricing,
      success: true,
      currency: 'PKR',
      items: validLines,
      shipping: { amount: shippingAmount, free, threshold: freeThreshold, remainingForFreeShipping: Math.max(0, freeThreshold - discountedSubtotal) },
      total: Number((discountedSubtotal + shippingAmount).toFixed(2)),
      quotedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Unable to quote cart.' }, { status: 500 });
  }
}
