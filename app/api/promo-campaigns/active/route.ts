import { NextResponse } from 'next/server';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

const CAMPAIGNS_COL = 'promo-campaigns';
const IMAGES_COL = 'promo-campaign-images';

export async function GET() {
  try {
    const serverNow = new Date().toISOString();
    const nowMs = Date.now();

    const snap = await getDocs(collection(db, CAMPAIGNS_COL));
    const activeCampaigns: any[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      if (d.id === '_schema' || data.type === 'collection-schema') continue;
      if (data.status !== 'active') continue;

      const startsMs = new Date(data.startsAt).getTime();
      const endsMs = new Date(data.endsAt).getTime();
      if (nowMs < startsMs || nowMs >= endsMs) continue;

      // Fetch background image
      let backgroundImageUrl = '';
      try {
        const imgSnap = await getDoc(doc(db, IMAGES_COL, d.id));
        if (imgSnap.exists()) {
          const imgData = imgSnap.data();
          if (typeof imgData.dataUrl === 'string' && imgData.dataUrl.startsWith('data:image/'))
            backgroundImageUrl = imgData.dataUrl;
        }
      } catch { /* ignore image fetch errors */ }

      activeCampaigns.push({
        id: d.id,
        badgeText: data.badgeText || '',
        heading: data.heading || '',
        description: data.description || '',
        highlightText: data.highlightText || '',
        ctaText: data.ctaText || 'Shop Now',
        discountMode: data.discountMode || 'automatic',
        discountType: data.discountType || 'percentage',
        discountValue: Number(data.discountValue || 0),
        couponCode: data.couponCode || '',
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        targetType: data.targetType || 'all-products',
        productIds: data.productIds || [],
        categoryIds: data.categoryIds || [],
        backgroundImageUrl,
        backgroundImageId: data.backgroundImageId || d.id,
        timezone: data.timezone || 'Asia/Karachi',
        hideAfterExpiry: data.hideAfterExpiry !== false,
        backgroundOverlayOpacity: Number(data.backgroundOverlayOpacity ?? 0.55),
        textAlignment: data.textAlignment || 'left',
        order: Number(data.order || 0),
      });
    }

    activeCampaigns.sort((a, b) => a.order - b.order);

    return NextResponse.json({
      success: true,
      data: activeCampaigns,
      serverNow,
    });
  } catch (error: any) {
    console.error('[API GET /api/promo-campaigns/active] Error:', error);
    return NextResponse.json({ success: false, data: [], serverNow: new Date().toISOString(), message: error.message }, { status: 500 });
  }
}
