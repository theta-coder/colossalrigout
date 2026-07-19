import { NextResponse } from 'next/server';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

const CARDS_COL = 'campaign-cards';
const IMAGES_COL = 'campaign-card-images';

export async function GET() {
  try {
    const nowMs = Date.now();
    const serverNow = new Date().toISOString();

    const snap = await getDocs(collection(db, CARDS_COL));
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

      activeCards.push({
        id: d.id,
        cardType: data.cardType || 'discount',
        eyebrowText: data.eyebrowText || '',
        heading: data.heading || '',
        description: data.description || '',
        buttonText: data.buttonText || '',
        overlayOpacity: Number(data.overlayOpacity ?? 0.4),
        textPosition: data.textPosition || 'bottom-left',
        actionType: data.actionType || 'campaign-products',
        productId: data.productId || '',
        collectionId: data.collectionId || '',
        storeId: data.storeId || '',
        internalPath: data.internalPath || '',
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
