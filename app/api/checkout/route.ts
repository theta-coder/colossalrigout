import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, runTransaction, getDocs, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const PROMOTIONS_COL = 'promotions';
const REDEMPTIONS_COL = 'promotion-redemptions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shippingInfo, shipCost, payMethod, items, ownerId, promoCodeApplied } = body;
    
    if (!Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }
    if (!shippingInfo?.name || !shippingInfo?.address || !shippingInfo?.email) {
      return NextResponse.json({ error: 'Incomplete shipping information.' }, { status: 400 });
    }
    if (items.some(item => !item.variantId)) {
      return NextResponse.json({ error: 'One or more cart items have no inventory variant. Add them again.' }, { status: 400 });
    }

    const orderId = `CR-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const nowMs = Date.now();

    // 1. Fetch matching coupon promotion before transaction (queries cannot run inside transaction)
    let matchingPromoId: string | null = null;
    let userRedemptionsCount = 0;

    if (promoCodeApplied) {
      const q = query(
        collection(db, PROMOTIONS_COL),
        where('applicationMode', '==', 'coupon'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data();
        if (data.couponCode && String(data.couponCode).toUpperCase().trim() === String(promoCodeApplied).toUpperCase().trim()) {
          matchingPromoId = d.id;
        }
      });

      if (!matchingPromoId) {
        throw new Error('Invalid or expired coupon code.');
      }

      // Check current user redemptions count
      if (ownerId && matchingPromoId) {
        const redQ = query(
          collection(db, REDEMPTIONS_COL),
          where('promotionId', '==', matchingPromoId),
          where('userId', '==', ownerId)
        );
        const redSnap = await getDocs(redQ);
        userRedemptionsCount = redSnap.size;
      }
    }

    // 2. Fetch active automatic promotions
    const autoPromosSnap = await getDocs(collection(db, PROMOTIONS_COL));
    const activeAutoPromos: any[] = [];
    autoPromosSnap.forEach(d => {
      const data = d.data();
      if (data.status !== 'active' || data.applicationMode !== 'automatic') return;
      const startsMs = new Date(data.startsAt).getTime();
      const endsMs = new Date(data.endsAt).getTime();
      if (nowMs >= startsMs && nowMs < endsMs) {
        activeAutoPromos.push({ id: d.id, ...data });
      }
    });

    // 3. Start Firestore Transaction
    const order = await runTransaction(db, async transaction => {
      let matchedCouponPromo: any = null;

      if (matchingPromoId) {
        const promoRef = doc(db, PROMOTIONS_COL, matchingPromoId);
        const promoSnap = await transaction.get(promoRef);
        if (promoSnap.exists()) {
          matchedCouponPromo = { id: promoSnap.id, ...promoSnap.data() };
        }
      }

      // Validate matched coupon rules
      if (matchedCouponPromo) {
        // Date checks
        const startsMs = new Date(matchedCouponPromo.startsAt).getTime();
        const endsMs = new Date(matchedCouponPromo.endsAt).getTime();
        if (nowMs < startsMs || nowMs >= endsMs) {
          throw new Error('This promotion is no longer active.');
        }

        // Login check
        if (matchedCouponPromo.loginRequired && !ownerId) {
          throw new Error('You must be logged in to redeem this promotion.');
        }

        // User limit check
        if (ownerId && userRedemptionsCount >= matchedCouponPromo.maxUsesPerUser) {
          throw new Error(`You have already reached the limit for this offer (${matchedCouponPromo.maxUsesPerUser} use).`);
        }

        // Global limit check
        if (matchedCouponPromo.globalUsageLimit && matchedCouponPromo.usedCount >= matchedCouponPromo.globalUsageLimit) {
          throw new Error('This coupon has reached its maximum global limit.');
        }
      }

      let rawSubtotal = 0;
      let eligibleSubtotalForCoupon = 0;
      const snapshots: any[] = [];

      // Helper to check item targeting
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
          const catId = String(p.categoryId || p.categorySlug || '').toLowerCase().trim();
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

      // Process items and calculate pricing
      for (const item of items) {
        const [variantSnapshot, productSnapshot] = await Promise.all([
          transaction.get(doc(db, 'product-variants', item.variantId)),
          transaction.get(doc(db, 'products', String(item.id)))
        ]);

        if (!variantSnapshot.exists() || !productSnapshot.exists()) {
          throw new Error(`${item.name} is no longer available.`);
        }

        const variant = variantSnapshot.data();
        const product = productSnapshot.data();
        const quantity = Math.max(1, Number(item.qty || 1));
        const available = Number(variant.availableStock || 0);

        if (available < quantity) {
          throw new Error(`Only ${available} units of ${item.name} are available.`);
        }

        const retail = Number(product.retailPrice || 0);
        const manualDiscount = product.discountPrice ? Number(product.discountPrice) : null;
        let basePrice = manualDiscount !== null && manualDiscount < retail ? manualDiscount : retail;

        // Apply active automatic promotions
        let bestAutoPromoPrice = basePrice;
        let appliedAutoPromo: any = null;

        for (const promo of activeAutoPromos) {
          if (checkEligibility({ id: item.id, ...product }, promo)) {
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

        basePrice = bestAutoPromoPrice;

        // Apply coupon-based promotion
        let isEligibleForCoupon = false;
        let finalPrice = basePrice;

        if (matchedCouponPromo && checkEligibility({ id: item.id, ...product }, matchedCouponPromo)) {
          isEligibleForCoupon = true;
          let couponPromoPrice = retail;
          if (matchedCouponPromo.discountType === 'percentage') {
            couponPromoPrice = retail * (1 - Number(matchedCouponPromo.discountValue || 0) / 100);
          } else if (matchedCouponPromo.discountType === 'fixed') {
            couponPromoPrice = Math.max(0.01, retail - Number(matchedCouponPromo.discountValue || 0));
          }
          finalPrice = Math.min(finalPrice, couponPromoPrice);
        }

        rawSubtotal += finalPrice * quantity;
        if (isEligibleForCoupon) {
          eligibleSubtotalForCoupon += finalPrice * quantity;
        }

        snapshots.push({
          item,
          variant,
          product,
          variantSnapshot,
          productSnapshot,
          quantity,
          available,
          unitPrice: Number(finalPrice.toFixed(2)),
          autoPromoId: appliedAutoPromo?.id || null
        });
      }

      // Calculate coupon discount
      let discountAmount = 0;
      let discountSnapshot: any = null;

      if (matchedCouponPromo) {
        const minOrder = Number(matchedCouponPromo.minimumOrder || 0);
        if (minOrder > 0 && eligibleSubtotalForCoupon < minOrder) {
          throw new Error(`Minimum order of $${minOrder.toFixed(2)} is required for coupon ${matchedCouponPromo.couponCode}.`);
        }
        
        if (matchedCouponPromo.discountType === 'percentage') {
          discountAmount = eligibleSubtotalForCoupon * (Number(matchedCouponPromo.discountValue) / 100);
        } else if (matchedCouponPromo.discountType === 'fixed') {
          discountAmount = Math.min(eligibleSubtotalForCoupon, Number(matchedCouponPromo.discountValue));
        }

        if (matchedCouponPromo.maximumDiscount && discountAmount > matchedCouponPromo.maximumDiscount) {
          discountAmount = matchedCouponPromo.maximumDiscount;
        }

        discountSnapshot = {
          type: matchedCouponPromo.discountType,
          value: Number(matchedCouponPromo.discountValue),
          campaignName: matchedCouponPromo.name,
        };
      }

      const finalSubtotal = Math.max(0, rawSubtotal - discountAmount);
      const deliveryDate = new Date(); 
      deliveryDate.setDate(deliveryDate.getDate() + (Number(shipCost) === 12 ? 2 : 6));

      const orderData = {
        orderId,
        statusIndex: 0,
        delivery: deliveryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        total: Number((finalSubtotal + Number(shipCost || 0)).toFixed(2)),
        payMethod: payMethod || 'Cash on Delivery',
        customer: shippingInfo,
        ownerId: ownerId || null,
        createdAt: now,
        items: snapshots.map(({ item, variant, product, quantity, unitPrice }) => ({
          id: item.id,
          productId: String(item.id),
          variantId: item.variantId,
          sku: variant.sku,
          name: product.name,
          size: item.size,
          color: item.color,
          price: unitPrice,
          qty: quantity,
          img: item.img || '/colossal-rigout-logo.png'
        })),
        promotionId: matchedCouponPromo?.id || null,
        promoCodeApplied: promoCodeApplied || null,
        eligibleSubtotal: Number((matchedCouponPromo ? eligibleSubtotalForCoupon : rawSubtotal).toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        discountSnapshot: discountSnapshot || null
      };

      // 4. Update stock and write ledger transactions
      for (const entry of snapshots) {
        const newAvailable = entry.available - entry.quantity;
        transaction.update(entry.variantSnapshot.ref, {
          stockOnHand: Number(entry.variant.stockOnHand || 0) - entry.quantity,
          availableStock: newAvailable,
          updatedAt: now
        });
        transaction.update(entry.productSnapshot.ref, {
          soldUnits: Number(entry.product.soldUnits || 0) + entry.quantity,
          updatedAt: now
        });

        const ledgerRef = doc(collection(db, 'inventory-transactions'));
        transaction.set(ledgerRef, {
          id: ledgerRef.id,
          productId: String(entry.item.id),
          variantId: entry.item.variantId,
          type: 'sale',
          quantityDelta: -entry.quantity,
          stockBefore: entry.available,
          stockAfter: newAvailable,
          orderId,
          actorId: ownerId || 'guest',
          createdAt: now
        });
      }

      // 5. Update promotion usage and write redemption record
      if (matchedCouponPromo) {
        const promoRef = doc(db, PROMOTIONS_COL, matchedCouponPromo.id);
        transaction.update(promoRef, {
          usedCount: Number(matchedCouponPromo.usedCount || 0) + 1,
          updatedAt: now
        });

        const redRef = doc(collection(db, REDEMPTIONS_COL));
        transaction.set(redRef, {
          id: redRef.id,
          promotionId: matchedCouponPromo.id,
          userId: ownerId || 'guest',
          orderId,
          channel: 'online',
          discountAmount: Number(discountAmount.toFixed(2)),
          redeemedAt: now
        });
      }

      // Write Order Document
      transaction.set(doc(db, 'orders', orderId), orderData);
      return orderData;
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('[API POST /api/checkout] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Checkout transaction failed.' }, { status: 409 });
  }
}
