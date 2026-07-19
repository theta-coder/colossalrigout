import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// GET: Fetch all promo codes (standalone + dynamic campaign virtual coupons)
export async function GET() {
  try {
    const [promosSnap, campaignsSnap] = await Promise.all([
      getDocs(collection(db, 'promos')),
      getDocs(collection(db, 'promo-campaigns')),
    ]);

    const loaded: any[] = [];
    promosSnap.forEach((docSnap) => {
      // Exclude schema or config documents if any
      if (docSnap.id !== '_schema') {
        loaded.push(docSnap.data());
      }
    });

    // Load active timed campaign coupons as virtual coupons
    const nowMs = Date.now();
    campaignsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status !== 'active') return;

      const startsMs = new Date(data.startsAt).getTime();
      const endsMs = new Date(data.endsAt).getTime();
      if (nowMs < startsMs || nowMs >= endsMs) return;

      if (data.discountMode === 'coupon' && data.couponCode) {
        loaded.push({
          code: String(data.couponCode).toUpperCase().trim(),
          type: data.discountType || 'percentage',
          value: Number(data.discountValue || 0),
          minOrder: Number(data.minimumOrder || 0),
          status: 'Active',
          campaignId: docSnap.id,
          targetType: data.targetType || 'all-products',
          productIds: data.productIds || [],
          categoryIds: data.categoryIds || []
        });
      }
    });

    return NextResponse.json({ promos: loaded, source: 'firestore' });
  } catch (error: any) {
    console.error("[API GET /api/promos] Error fetching promos:", error);
    return NextResponse.json({ promos: [], source: 'error', error: error.message }, { status: 500 });
  }
}

// POST: Add or update a promo code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { promo } = body;
    if (!promo || !promo.code) {
      return NextResponse.json({ error: "Promo code details are required" }, { status: 400 });
    }
    
    const promoCode = promo.code.toUpperCase().replace(/\s+/g, '');
    const formattedPromo = {
      ...promo,
      code: promoCode,
      value: Number(promo.value),
      minOrder: Number(promo.minOrder || 0),
    };
    
    await setDoc(doc(db, 'promos', promoCode), formattedPromo);
    const now = new Date().toISOString();
    await setDoc(doc(db, 'promotions', `coupon-${promoCode}`), {
      id: `coupon-${promoCode}`, name: `Coupon ${promoCode}`, publicMessage: `${promoCode} checkout discount`,
      discountType: formattedPromo.type, discountValue: formattedPromo.value, minimumOrder: formattedPromo.minOrder,
      applicationMode: 'coupon', couponCode: promoCode, stackable: false,
      targetType: 'all-products', productIds: [], categoryIds: [], collectionIds: [],
      loginRequired: false, maxUsesPerUser: 0, usedCount: 0, channel: 'online', storeIds: [],
      startsAt: now, endsAt: '2099-12-31T23:59:59.999Z',
      status: formattedPromo.status === 'Active' ? 'active' : 'inactive', createdAt: now, updatedAt: now
    }, { merge: true });
    console.log(`[API POST /api/promos] Created promo code ${promoCode}`);
    return NextResponse.json({ success: true, promo: formattedPromo });
  } catch (error: any) {
    console.error("[API POST /api/promos] Error writing promo to Firestore:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a promo code
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: "Promo code parameter is required" }, { status: 400 });
    }
    
    await deleteDoc(doc(db, 'promos', code.toUpperCase()));
    await deleteDoc(doc(db, 'promotions', `coupon-${code.toUpperCase()}`));
    console.log(`[API DELETE /api/promos] Deleted promo code ${code}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API DELETE /api/promos] Error deleting promo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
