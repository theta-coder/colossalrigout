import { NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';

async function readPromotionProducts() {
  const [productSnap, imageSnap, colorSnap, sizeSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'product-images')),
    getDocs(collection(db, 'colors')),
    getDocs(collection(db, 'sizes')),
  ]);
  const images = new Map<string, Array<{ dataUrl: string; order: number }>>();
  imageSnap.forEach(item => {
    const data = item.data();
    if (typeof data.dataUrl !== 'string' || !data.dataUrl.startsWith('data:image/webp;base64,') || data.dataUrl.length > 750_000) return;
    const list = images.get(String(data.productId)) || [];
    list.push({ dataUrl: data.dataUrl, order: Number(data.order || 0) });
    images.set(String(data.productId), list);
  });
  const colors = new Map(colorSnap.docs.map(item => [item.id, String(item.data().name || item.id)]));
  const sizes = new Map(sizeSnap.docs.map(item => [item.id, String(item.data().code || item.data().name || item.id)]));
  return productSnap.docs.filter(item => item.id !== '_schema').map(item => {
    const data = item.data();
    const productImages = (images.get(item.id) || []).sort((a, b) => a.order - b.order).map(image => image.dataUrl);
    const retailPrice = Number(data.retailPrice || data.price || 0);
    return {
      ...data,
      id: /^\d+$/.test(item.id) ? Number(item.id) : item.id,
      retailPrice,
      discountPrice: data.discountPrice ? Number(data.discountPrice) : null,
      price: Number(data.discountPrice || retailPrice),
      img: productImages[0] || '/product-placeholder.png',
      images: productImages.length ? productImages : ['/product-placeholder.png'],
      colors: (data.colorIds || data.colors || []).map((value: string) => colors.get(value) || value),
      sizes: (data.sizeIds || data.sizes || []).map((value: string) => sizes.get(value) || value),
      collections: data.collectionIds || data.collections || [],
      cat: data.categorySlug || data.cat || data.categoryId || '',
    };
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const snapshot = await getDoc(doc(db, 'promotions', id));
    if (!snapshot.exists()) return NextResponse.json({ success: false, message: 'Promotion not found' }, { status: 404 });
    const promotion = { id: snapshot.id, ...snapshot.data() } as any;
    const now = Date.now();
    if (promotion.status !== 'active' || now < new Date(promotion.startsAt).getTime() || now >= new Date(promotion.endsAt).getTime()) {
      return NextResponse.json({ success: false, message: 'Promotion is not active' }, { status: 410 });
    }
    const all = (await readPromotionProducts()).filter((product: any) => product.status === 'active');
    const ids = (values: unknown) => Array.isArray(values) ? values.map(String) : [];
    const normalized = (value: unknown) => String(value || '').toLowerCase().trim();
    const products = all.filter((product: any) => {
      if (promotion.targetType === 'all-products') return true;
      if (promotion.targetType === 'selected-products') return ids(promotion.productIds).includes(String(product.id));
      if (promotion.targetType === 'selected-categories') {
        const targets = ids(promotion.categoryIds).map(normalized);
        return targets.includes(normalized(product.categoryId)) || targets.includes(normalized(product.categorySlug || product.cat));
      }
      if (promotion.targetType === 'selected-collections') {
        const targets = ids(promotion.collectionIds);
        return ids(product.collectionIds || product.collections).some(item => targets.includes(item));
      }
      return false;
    }).map((product: any) => {
      const retail = Number(product.retailPrice || 0);
      const current = Number(product.discountPrice || retail);
      let promotional = retail;
      if (promotion.discountType === 'percentage') promotional = retail * (1 - Number(promotion.discountValue || 0) / 100);
      if (promotion.discountType === 'fixed') promotional = Math.max(0.01, retail - Number(promotion.discountValue || 0));
      const automatic = promotion.applicationMode === 'automatic';
      return { ...product, price: Number((automatic ? Math.min(current, promotional) : current).toFixed(2)), promotionId: id };
    });
    return NextResponse.json({ success: true, data: products, campaign: { id, heading: promotion.publicMessage || promotion.name, discountMode: promotion.applicationMode } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
