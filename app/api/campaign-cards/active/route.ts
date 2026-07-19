import { NextResponse } from 'next/server';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

const CARDS_COL = 'campaign-cards';
const IMAGES_COL = 'campaign-card-images';

export async function GET() {
  try {
    const nowMs = Date.now();
    const serverNow = new Date().toISOString();

    const [snap, promotionsSnap, storesSnap] = await Promise.all([
      getDocs(collection(db, CARDS_COL)),
      getDocs(collection(db, 'promotions')),
      getDocs(collection(db, 'stores')),
    ]);
    const promotions = new Map(promotionsSnap.docs.map(item => [item.id, item.data()]));
    const stores = new Map(storesSnap.docs.map(item => [item.id, item.data()]));
    const activeCards: any[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      if (data.status !== 'active') continue;

      const startsMs = new Date(data.startsAt).getTime();
      const endsMs = new Date(data.endsAt).getTime();
      if (nowMs < startsMs || nowMs >= endsMs) continue;

      // Resolve background image
      let backgroundImageUrl = '';
      try {
        const imgSnap = await getDoc(doc(db, IMAGES_COL, d.id));
        if (imgSnap.exists()) {
          const imgData = imgSnap.data();
          if (typeof imgData.dataUrl === 'string' && imgData.dataUrl.startsWith('data:image/'))
            backgroundImageUrl = imgData.dataUrl;
        }
      } catch { /* ignore image fetch errors */ }

      const promotion = data.promotionId ? promotions.get(String(data.promotionId)) : undefined;
      const store = data.storeId ? stores.get(String(data.storeId)) : undefined;
      const remainingUses = promotion?.globalUsageLimit
        ? Math.max(0, Number(promotion.globalUsageLimit) - Number(promotion.usedCount || 0))
        : '';
      const discount = promotion
        ? promotion.discountType === 'percentage'
          ? `${Number(promotion.discountValue || 0)}% OFF`
          : promotion.discountType === 'fixed'
            ? `$${Number(promotion.discountValue || 0)} OFF`
            : 'FREE SHIPPING'
        : '';
      const tokens: Record<string, string> = {
        discount,
        coupon: String(promotion?.couponCode || ''),
        remainingUses: String(remainingUses),
        storeName: String(store?.name || ''),
      };
      const interpolate = (value: unknown) => String(value || '').replace(/\{\{(discount|coupon|remainingUses|storeName)\}\}/g, (_, key) => tokens[key]);

      activeCards.push({
        id: d.id,
        cardType: data.cardType || 'discount',
        eyebrowText: interpolate(data.eyebrowText),
        heading: interpolate(data.heading),
        description: interpolate(data.description),
        buttonText: interpolate(data.buttonText),
        overlayOpacity: Number(data.overlayOpacity ?? 0.4),
        textPosition: data.textPosition || 'bottom-left',
        actionType: data.actionType || 'campaign-products',
        productId: data.productId || '',
        collectionId: data.collectionId || '',
        storeId: data.storeId || '',
        internalPath: typeof data.internalPath === 'string' && data.internalPath.startsWith('/') && !data.internalPath.startsWith('//') && !data.internalPath.includes('\\') ? data.internalPath : '',
        hasDiscount: !!data.hasDiscount,
        promotionId: data.promotionId || '',
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        backgroundImageUrl,
        order: Number(data.order || 0),
      });
    }

    activeCards.sort((a, b) => a.order - b.order);

    return NextResponse.json({
      success: true,
      data: activeCards,
      serverNow,
    });
  } catch (error: any) {
    console.error('[API GET /api/campaign-cards/active] Error:', error);
    return NextResponse.json({ success: false, data: [], serverNow: new Date().toISOString(), message: error.message }, { status: 500 });
  }
}
