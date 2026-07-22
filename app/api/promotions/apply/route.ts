import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { verifyFirebaseUser } from '../../../../lib/serverAuth';

const PROMOTIONS_COL = 'promotions';

export async function POST(req: NextRequest) {
  try {
    const { items, couponCode } = await req.json();
    const verifiedUser = await verifyFirebaseUser(req);
    const userId = verifiedUser?.uid || '';
    if (!Array.isArray(items) || !items.length) {
      return NextResponse.json({ success: true, discountAmount: 0, items: [] });
    }

    const nowMs = Date.now();

    // Fetch all active promotions
    const promotionsSnap = await getDocs(collection(db, PROMOTIONS_COL));
    const activePromotions: any[] = [];
    let matchedCouponPromo: any = null;

    promotionsSnap.forEach((d) => {
      const data = d.data();
      if (data.status !== 'active') return;

      const startsMs = new Date(data.startsAt).getTime();
      const endsMs = new Date(data.endsAt).getTime();
      if (nowMs < startsMs || nowMs >= endsMs) return;

      if (data.applicationMode === 'automatic') {
        activePromotions.push({ id: d.id, ...data });
      } else if (
        data.applicationMode === 'coupon' &&
        couponCode &&
        String(data.couponCode).toUpperCase().trim() === String(couponCode).toUpperCase().trim()
      ) {
        matchedCouponPromo = { id: d.id, ...data };
      }
    });

    // Preview must respect the same login and usage limits as checkout. Checkout
    // still revalidates transactionally to prevent races.
    const usageAllowed = async (promotion: any) => {
      if (promotion.loginRequired && !userId) return false;
      if (promotion.globalUsageLimit && Number(promotion.usedCount || 0) >= Number(promotion.globalUsageLimit)) return false;
      if (userId && promotion.maxUsesPerUser) {
        const usage = await getDoc(doc(db, 'promotion-user-usage', `${promotion.id}_${userId}`));
        if (usage.exists() && Number(usage.data().count || 0) >= Number(promotion.maxUsesPerUser)) return false;
      }
      return true;
    };
    const allowedAutomatic: any[] = [];
    for (const promotion of activePromotions) if (await usageAllowed(promotion)) allowedAutomatic.push(promotion);
    if (matchedCouponPromo && !(await usageAllowed(matchedCouponPromo))) matchedCouponPromo = null;

    const checkEligibility = (p: any, promo: any) => {
      if (!promo) return false;
      const targetType = promo.targetType;
      if (targetType === 'all-products') return true;
      if (targetType === 'selected-products') {
        const pids = Array.isArray(promo.productIds) ? promo.productIds.map(String) : [];
        return pids.includes(String(p.id));
      }
      if (targetType === 'selected-categories') {
        const cids = Array.isArray(promo.categoryIds) ? promo.categoryIds.map((s: any) => String(s).toLowerCase().trim()) : [];
        const catId = String(p.categoryId || p.categorySlug || p.cat || '').toLowerCase().trim();
        const catSlug = String(p.categorySlug || p.cat || '').toLowerCase().trim();
        return cids.includes(catId) || cids.includes(catSlug);
      }
      if (targetType === 'selected-collections') {
        const colids = Array.isArray(promo.collectionIds) ? promo.collectionIds : [];
        const pcols = Array.isArray(p.collectionIds || p.collections) ? (p.collectionIds || p.collections) : [];
        return pcols.some((c: any) => colids.includes(String(c)));
      }
      return false;
    };

    let rawSubtotal = 0;
    let eligibleSubtotalForCoupon = 0;
    let couponSavings = 0;
    let automaticSavings = 0;
    const automaticSavingsByPromo = new Map<string, { promotion: any; amount: number }>();
    const processedItems = [];

    for (const item of items) {
      const productSnapshot = await getDoc(doc(db, 'products', String(item.productId || item.id)));
      if (!productSnapshot.exists()) continue;
      const product = { id: productSnapshot.id, ...productSnapshot.data() } as any;
      const retail = Number(product.retailPrice || product.price || 0);
      const manualDiscount = product.discountPrice ? Number(product.discountPrice) : null;
      let basePrice = manualDiscount !== null && manualDiscount < retail ? manualDiscount : retail;

      // Apply active automatic promotions
      let bestAutoPromoPrice = basePrice;
      let appliedAutoPromo: any = null;

      for (const promo of allowedAutomatic) {
        if (checkEligibility(product, promo)) {
          let promoPrice = retail;
          if (promo.discountType === 'percentage') {
            promoPrice = retail * (1 - Number(promo.discountValue || 0) / 100);
          } else if (promo.discountType === 'fixed') {
            promoPrice = Math.max(0.01, retail - Number(promo.discountValue || 0));
          }
          if (promoPrice < bestAutoPromoPrice) {
            bestAutoPromoPrice = promoPrice;
            appliedAutoPromo = promo;
          }
        }
      }

      const lineAutomaticSaving = Math.max(0, basePrice - bestAutoPromoPrice) * Number(item.qty || item.quantity || 1);
      automaticSavings += lineAutomaticSaving;
      if (appliedAutoPromo && lineAutomaticSaving > 0) {
        const current = automaticSavingsByPromo.get(appliedAutoPromo.id);
        automaticSavingsByPromo.set(appliedAutoPromo.id, { promotion: appliedAutoPromo, amount: (current?.amount || 0) + lineAutomaticSaving });
      }
      basePrice = bestAutoPromoPrice;

      // Apply coupon-based promotion
      let isEligibleForCoupon = false;
      let finalPrice = basePrice;

      if (matchedCouponPromo && checkEligibility(product, matchedCouponPromo)) {
        isEligibleForCoupon = true;
        let couponPromoPrice = retail;
        if (matchedCouponPromo.discountType === 'percentage') {
          couponPromoPrice = retail * (1 - Number(matchedCouponPromo.discountValue || 0) / 100);
        } else if (matchedCouponPromo.discountType === 'fixed') {
          couponPromoPrice = Math.max(0.01, retail - Number(matchedCouponPromo.discountValue || 0));
        }
        finalPrice = Math.min(finalPrice, couponPromoPrice);
      }

      const qty = Number(item.qty || item.quantity || 1);
      rawSubtotal += finalPrice * qty;
      if (isEligibleForCoupon) {
        eligibleSubtotalForCoupon += basePrice * qty;
        couponSavings += Math.max(0, basePrice - finalPrice) * qty;
      }

      processedItems.push({
        ...item,
        price: Number(finalPrice.toFixed(2)),
        originalPrice: retail,
        appliedAutoPromoId: appliedAutoPromo?.id || null,
      });
    }

    // Single offer rule: If automatic savings exist, coupon promotion cannot be stacked.
    const autoPromos = Array.from(automaticSavingsByPromo.values());
    const hasAutoPromo = autoPromos.length > 0 && automaticSavings > 0;

    let discountAmount = 0;
    let discountSnapshot: any = null;

    if (!hasAutoPromo && matchedCouponPromo) {
      const minOrder = Number(matchedCouponPromo.minimumOrder || 0);
      if (minOrder <= 0 || eligibleSubtotalForCoupon >= minOrder) {
        const maximumDiscount = Number(matchedCouponPromo.maximumDiscount || 0);
        discountAmount = maximumDiscount > 0 ? Math.min(couponSavings, maximumDiscount) : couponSavings;

        discountSnapshot = {
          type: matchedCouponPromo.discountType,
          value: Number(matchedCouponPromo.discountValue),
          name: matchedCouponPromo.name,
        };
      }
    }

    const appliedPromotions = hasAutoPromo
      ? autoPromos.slice(0, 1).map(({ promotion, amount }) => ({
          id: promotion.id,
          name: promotion.publicMessage || promotion.name || 'Automatic promotion',
          mode: 'automatic',
          code: null,
          discountType: promotion.discountType,
          discountValue: Number(promotion.discountValue || 0),
          discountAmount: Number(amount.toFixed(2)),
          minimumOrder: Number(promotion.minimumOrder || 0),
          maximumDiscount: Number(promotion.maximumDiscount || 0) || null,
        }))
      : matchedCouponPromo && discountAmount > 0
      ? [
          {
            id: matchedCouponPromo.id,
            name: matchedCouponPromo.publicMessage || matchedCouponPromo.name || 'Coupon promotion',
            mode: 'coupon',
            code: String(matchedCouponPromo.couponCode || couponCode || '').toUpperCase(),
            discountType: matchedCouponPromo.discountType,
            discountValue: Number(matchedCouponPromo.discountValue || 0),
            discountAmount: Number(discountAmount.toFixed(2)),
            minimumOrder: Number(matchedCouponPromo.minimumOrder || 0),
            maximumDiscount: Number(matchedCouponPromo.maximumDiscount || 0) || null,
          },
        ]
      : [];

    const totalDiscount = hasAutoPromo ? automaticSavings : discountAmount;

    return NextResponse.json({
      success: true,
      rawSubtotal: Number(rawSubtotal.toFixed(2)),
      discountAmount: Number(totalDiscount.toFixed(2)),
      finalSubtotal: Number(Math.max(0, rawSubtotal - (hasAutoPromo ? 0 : discountAmount)).toFixed(2)),
      items: processedItems,
      discountSnapshot,
      appliedPromotions,
    });
  } catch (error: any) {
    console.error('[API POST /api/promotions/apply] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
