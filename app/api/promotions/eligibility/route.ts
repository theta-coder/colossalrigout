import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { verifyFirebaseUser } from '../../../../lib/serverAuth';

const PROMOTIONS_COL = 'promotions';
const REDEMPTIONS_COL = 'promotion-redemptions';

export async function POST(req: NextRequest) {
  try {
    const { promotionId, cartItems, couponCode } = await req.json();
    const verifiedUser = await verifyFirebaseUser(req);
    const userId = verifiedUser?.uid || '';

    const nowMs = Date.now();

    let promoDoc: any = null;
    if (promotionId) {
      const ref = doc(db, PROMOTIONS_COL, promotionId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        promoDoc = { id: snap.id, ...snap.data() };
      }
    } else if (couponCode) {
      // Single offer rule: If an automatic promotion is active, reject applying coupon codes
      const allPromosSnap = await getDocs(collection(db, PROMOTIONS_COL));
      let hasActiveAutoPromo = false;

      allPromosSnap.forEach((d) => {
        const data = d.data();
        if (data.status === 'active' && data.applicationMode === 'automatic') {
          const startsMs = new Date(data.startsAt).getTime();
          const endsMs = new Date(data.endsAt).getTime();
          if (nowMs >= startsMs && nowMs < endsMs) {
            hasActiveAutoPromo = true;
          }
        }
      });

      if (hasActiveAutoPromo) {
        return NextResponse.json({
          success: true,
          eligible: false,
          reason: 'An offer has already been applied. Only one promotion can be used at a time.',
        });
      }

      allPromosSnap.forEach((d) => {
        const data = d.data();
        if (
          data.applicationMode === 'coupon' &&
          data.couponCode &&
          data.couponCode.toUpperCase().trim() === couponCode.toUpperCase().trim()
        ) {
          promoDoc = { id: d.id, ...data };
        }
      });
    }

    if (!promoDoc) {
      return NextResponse.json({ success: true, eligible: false, reason: 'Promotion not found' });
    }

    if (promoDoc.status !== 'active') {
      return NextResponse.json({ success: true, eligible: false, reason: 'Promotion is not active' });
    }

    const startsMs = new Date(promoDoc.startsAt).getTime();
    const endsMs = new Date(promoDoc.endsAt).getTime();
    if (nowMs < startsMs) {
      return NextResponse.json({ success: true, eligible: false, reason: 'Promotion has not started yet' });
    }
    if (nowMs >= endsMs) {
      return NextResponse.json({ success: true, eligible: false, reason: 'Promotion has expired' });
    }

    if (promoDoc.loginRequired && !userId) {
      return NextResponse.json({
        success: true,
        eligible: false,
        reason: 'Login required',
        loginRequired: true,
      });
    }

    // Check user usage limit
    if (userId && promoDoc.maxUsesPerUser) {
      const redemptionsRef = collection(db, REDEMPTIONS_COL);
      const q = query(
        redemptionsRef,
        where('promotionId', '==', promoDoc.id),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      if (snap.size >= promoDoc.maxUsesPerUser) {
        return NextResponse.json({
          success: true,
          eligible: false,
          reason: `You have reached the maximum usage limit (${promoDoc.maxUsesPerUser}) for this promotion.`,
        });
      }
    }

    // Check global usage limit
    if (promoDoc.globalUsageLimit && promoDoc.usedCount >= promoDoc.globalUsageLimit) {
      return NextResponse.json({
        success: true,
        eligible: false,
        reason: 'This promotion has reached its maximum global usage limit.',
      });
    }

    // Verify cart items eligibility if provided
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      let hasEligibleItem = false;
      const targetType = promoDoc.targetType;

      for (const item of cartItems) {
        if (targetType === 'all-products') {
          hasEligibleItem = true;
          break;
        } else if (targetType === 'selected-products') {
          const pids = Array.isArray(promoDoc.productIds) ? promoDoc.productIds.map(String) : [];
          if (pids.includes(String(item.productId || item.id))) {
            hasEligibleItem = true;
            break;
          }
        } else if (targetType === 'selected-categories') {
          const cids = Array.isArray(promoDoc.categoryIds) ? promoDoc.categoryIds.map((s: any) => String(s).toLowerCase().trim()) : [];
          const catId = String(item.categoryId || item.categorySlug || item.cat || '').toLowerCase().trim();
          const catSlug = String(item.categorySlug || item.cat || '').toLowerCase().trim();
          if (cids.includes(catId) || cids.includes(catSlug)) {
            hasEligibleItem = true;
            break;
          }
        } else if (targetType === 'selected-collections') {
          const colids = Array.isArray(promoDoc.collectionIds) ? promoDoc.collectionIds : [];
          const pcols = Array.isArray(item.collectionIds || item.collections) ? (item.collectionIds || item.collections) : [];
          if (pcols.some((c: any) => colids.includes(String(c)))) {
            hasEligibleItem = true;
            break;
          }
        }
      }

      if (!hasEligibleItem) {
        return NextResponse.json({
          success: true,
          eligible: false,
          reason: 'Your cart does not contain any eligible items for this promotion.',
        });
      }
    }

    return NextResponse.json({ success: true, eligible: true, promotion: promoDoc });
  } catch (error: any) {
    console.error('[API POST /api/promotions/eligibility] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
