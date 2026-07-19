import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, runTransaction, getDocs, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { verifyFirebaseUser } from '../../../lib/serverAuth';

const PROMOTIONS_COL = 'promotions';
const REDEMPTIONS_COL = 'promotion-redemptions';
const USAGE_COL = 'promotion-user-usage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shippingInfo, shipCost, payMethod, items, ownerId: requestedOwnerId, promoCodeApplied } = body;
    const verifiedUser = await verifyFirebaseUser(request);
    const ownerId = verifiedUser?.uid || null;
    if (requestedOwnerId && requestedOwnerId !== ownerId) {
      return NextResponse.json({ error: 'Your login session could not be verified. Please sign in again.' }, { status: 401 });
    }
    
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
      let userUsageRef: ReturnType<typeof doc> | null = null;
      let userUsageCount = 0;

      if (matchingPromoId) {
        const promoRef = doc(db, PROMOTIONS_COL, matchingPromoId);
        const promoSnap = await transaction.get(promoRef);
        if (promoSnap.exists()) {
          matchedCouponPromo = { id: promoSnap.id, ...promoSnap.data() };
        }
        if (ownerId) {
          userUsageRef = doc(db, USAGE_COL, `${matchingPromoId}_${ownerId}`);
          const usageSnap = await transaction.get(userUsageRef);
          userUsageCount = usageSnap.exists() ? Number(usageSnap.data().count || 0) : 0;
        }
      }

      // Re-read automatic promotions and per-user usage inside the transaction so
      // checkout, not the campaign-card timer, is the source of truth for discounts.
      const usableAutoPromos: any[] = [];
      const autoUsage = new Map<string, { ref: ReturnType<typeof doc>; count: number }>();
      for (const candidate of activeAutoPromos) {
        const promoRef = doc(db, PROMOTIONS_COL, candidate.id);
        const promoSnap = await transaction.get(promoRef);
        if (!promoSnap.exists()) continue;
        const promo = { id: promoSnap.id, ...promoSnap.data() } as any;
        const starts = new Date(promo.startsAt).getTime();
        const ends = new Date(promo.endsAt).getTime();
        if (promo.status !== 'active' || promo.applicationMode !== 'automatic' || nowMs < starts || nowMs >= ends) continue;
        if (promo.loginRequired && !ownerId) continue;
        if (promo.globalUsageLimit && Number(promo.usedCount || 0) >= Number(promo.globalUsageLimit)) continue;
        if (ownerId) {
          const usageRef = doc(db, USAGE_COL, `${promo.id}_${ownerId}`);
          const usageSnap = await transaction.get(usageRef);
          const count = usageSnap.exists() ? Number(usageSnap.data().count || 0) : 0;
          if (promo.maxUsesPerUser && count >= Number(promo.maxUsesPerUser)) continue;
          autoUsage.set(promo.id, { ref: usageRef, count });
        }
        usableAutoPromos.push(promo);
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
        if (ownerId && matchedCouponPromo.maxUsesPerUser && userUsageCount >= Number(matchedCouponPromo.maxUsesPerUser)) {
          throw new Error(`You have already reached the limit for this offer (${matchedCouponPromo.maxUsesPerUser} use).`);
        }

        // Global limit check
        if (matchedCouponPromo.globalUsageLimit && matchedCouponPromo.usedCount >= matchedCouponPromo.globalUsageLimit) {
          throw new Error('This coupon has reached its maximum global limit.');
        }
      }

      let rawSubtotal = 0;
      let eligibleSubtotalForCoupon = 0;
      let couponSavings = 0;
      let automaticSavings = 0;
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
        const stockOnHand = Number(variant.stockOnHand ?? variant.stock ?? variant.availableStock ?? 0);
        const reservedStock = Number(variant.reservedStock ?? variant.reserved ?? 0);
        const available = Number(variant.availableStock ?? Math.max(stockOnHand - reservedStock, 0));

        if (available < quantity) {
          throw new Error(`Only ${available} units of ${item.name} are available.`);
        }

        const retail = Number(product.retailPrice || 0);
        const manualDiscount = product.discountPrice ? Number(product.discountPrice) : null;
        let basePrice = manualDiscount !== null && manualDiscount < retail ? manualDiscount : retail;

        // Apply active automatic promotions
        let bestAutoPromoPrice = basePrice;
        let appliedAutoPromo: any = null;

        for (const promo of usableAutoPromos) {
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

        automaticSavings += Math.max(0, basePrice - bestAutoPromoPrice) * quantity;
        const autoSavingAmount = Math.max(0, basePrice - bestAutoPromoPrice) * quantity;
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
          couponSavings += Math.max(0, basePrice - finalPrice) * quantity;
        }
        const couponSavingAmount = isEligibleForCoupon ? Math.max(0, basePrice - finalPrice) * quantity : 0;

        rawSubtotal += finalPrice * quantity;
        if (isEligibleForCoupon) {
          eligibleSubtotalForCoupon += basePrice * quantity;
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
          autoPromoId: appliedAutoPromo?.id || null,
          autoSavingAmount: Number(autoSavingAmount.toFixed(2)),
          isEligibleForCoupon,
          couponSavingAmount: Number(couponSavingAmount.toFixed(2))
        });
      }

      // Cap coupon savings across eligible lines without trusting a client total.
      const maximumCouponDiscount = Number(matchedCouponPromo?.maximumDiscount || 0);
      if (maximumCouponDiscount > 0 && couponSavings > maximumCouponDiscount) {
        const excess = couponSavings - maximumCouponDiscount;
        const totalUncappedSavings = couponSavings;
        snapshots.forEach(entry => {
          if (!entry.isEligibleForCoupon || entry.couponSavingAmount <= 0) return;
          const restoreTotal = excess * (entry.couponSavingAmount / totalUncappedSavings);
          entry.unitPrice = Number((entry.unitPrice + restoreTotal / entry.quantity).toFixed(2));
          rawSubtotal += restoreTotal;
        });
        couponSavings = maximumCouponDiscount;
      }

      // Calculate coupon discount
      let discountAmount = 0;
      let discountSnapshot: any = null;

      if (matchedCouponPromo) {
        const minOrder = Number(matchedCouponPromo.minimumOrder || 0);
        if (minOrder > 0 && eligibleSubtotalForCoupon < minOrder) {
          throw new Error(`Minimum order of $${minOrder.toFixed(2)} is required for coupon ${matchedCouponPromo.couponCode}.`);
        }
        
        // Coupon price is already applied to eligible lines. Keep the saving for
        // the order audit and never subtract the same discount a second time.
        discountAmount = couponSavings;

        discountSnapshot = {
          type: matchedCouponPromo.discountType,
          value: Number(matchedCouponPromo.discountValue),
          campaignName: matchedCouponPromo.name,
        };
      }


      // Each automatic promotion is redeemed once per order, regardless of the
      // number of eligible lines. This keeps global and per-user limits accurate.
      const appliedAutomaticPromos = new Map<string, { promo: any; amount: number }>();
      snapshots.forEach(entry => {
        if (!entry.autoPromoId) return;
        const existing = appliedAutomaticPromos.get(entry.autoPromoId);
        const promo = usableAutoPromos.find(item => item.id === entry.autoPromoId);
        if (promo) appliedAutomaticPromos.set(entry.autoPromoId, { promo, amount: (existing?.amount || 0) + Number(entry.autoSavingAmount || 0) });
      });
      for (const [promotionId, applied] of appliedAutomaticPromos) {
        transaction.update(doc(db, PROMOTIONS_COL, promotionId), {
          usedCount: Number(applied.promo.usedCount || 0) + 1,
          updatedAt: now,
        });
        const redemptionRef = doc(collection(db, REDEMPTIONS_COL));
        transaction.set(redemptionRef, {
          id: redemptionRef.id,
          promotionId,
          userId: ownerId || 'guest',
          orderId,
          channel: 'online',
          discountAmount: Number(applied.amount.toFixed(2)),
          redeemedAt: now,
        });
        const usage = autoUsage.get(promotionId);
        if (ownerId && usage) transaction.set(usage.ref, {
          promotionId,
          userId: ownerId,
          count: usage.count + 1,
          lastOrderId: orderId,
          updatedAt: now,
        }, { merge: true });
      }

      const finalSubtotal = Math.max(0, rawSubtotal);
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
          img: item.img || '/product-placeholder.png',
          promotionId: matchedCouponPromo?.id || snapshots.find(snapshot => snapshot.item === item)?.autoPromoId || null
        })),
        promotionId: matchedCouponPromo?.id || snapshots.find(snapshot => snapshot.autoPromoId)?.autoPromoId || null,
        promoCodeApplied: promoCodeApplied || null,
        eligibleSubtotal: Number((matchedCouponPromo ? eligibleSubtotalForCoupon : rawSubtotal).toFixed(2)),
        discountAmount: Number((discountAmount + automaticSavings).toFixed(2)),
        discountSnapshot: discountSnapshot || (automaticSavings > 0 ? {
          type: 'automatic',
          value: Number(automaticSavings.toFixed(2)),
          campaignName: 'Automatic promotion'
        } : null)
      };

      // 4. Update stock and write ledger transactions
      for (const entry of snapshots) {
        const newAvailable = entry.available - entry.quantity;
        transaction.update(entry.variantSnapshot.ref, {
          stockOnHand: Math.max(0, Number(entry.variant.stockOnHand ?? entry.variant.stock ?? entry.available) - entry.quantity),
          availableStock: newAvailable,
          stock: newAvailable,
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
        if (userUsageRef && ownerId) {
          transaction.set(userUsageRef, {
            promotionId: matchedCouponPromo.id,
            userId: ownerId,
            count: userUsageCount + 1,
            lastOrderId: orderId,
            updatedAt: now
          }, { merge: true });
        }
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
