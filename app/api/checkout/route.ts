import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, runTransaction, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const CAMPAIGNS_COL = 'promo-campaigns';
const PROMOS_COL = 'promos';

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

    const order = await runTransaction(db, async transaction => {
      // 1. Fetch all active campaigns
      const campaignsSnap = await getDocs(collection(db, CAMPAIGNS_COL));
      const activeAutomaticCampaigns: any[] = [];
      let matchedCouponCampaign: any = null;

      campaignsSnap.forEach(d => {
        const data = d.data();
        if (data.status !== 'active') return;
        const startsMs = new Date(data.startsAt).getTime();
        const endsMs = new Date(data.endsAt).getTime();
        if (nowMs < startsMs || nowMs >= endsMs) return;

        if (data.discountMode === 'automatic') {
          activeAutomaticCampaigns.push({ id: d.id, ...data });
        } else if (
          data.discountMode === 'coupon' &&
          promoCodeApplied &&
          String(data.couponCode).toUpperCase().trim() === String(promoCodeApplied).toUpperCase().trim()
        ) {
          matchedCouponCampaign = { id: d.id, ...data };
        }
      });

      // 2. Fetch standalone promo code if no coupon campaign matched
      let standalonePromo: any = null;
      if (promoCodeApplied && !matchedCouponCampaign) {
        const promoRef = doc(db, PROMOS_COL, String(promoCodeApplied).toUpperCase().trim());
        const promoSnap = await getDoc(promoRef);
        if (promoSnap.exists() && promoSnap.data().status === 'Active') {
          standalonePromo = promoSnap.data();
        } else {
          throw new Error('Invalid or expired promo code.');
        }
      }

      // Sort automatic campaigns by display order
      activeAutomaticCampaigns.sort((a, b) => (a.order || 0) - (b.order || 0));

      let rawSubtotal = 0;
      let eligibleSubtotalForCoupon = 0;
      const snapshots: any[] = [];

      // Helper to check if product is targeted by a campaign
      const checkEligibility = (p: any, camp: any) => {
        if (!camp) return false;
        if (camp.targetType === 'all-products') return true;
        if (camp.targetType === 'selected-products') {
          const pids = Array.isArray(camp.productIds) ? camp.productIds.map(String) : [];
          return pids.includes(String(p.id));
        }
        if (camp.targetType === 'selected-categories') {
          const cids = Array.isArray(camp.categoryIds) ? camp.categoryIds.map((s: any) => String(s).toLowerCase().trim()) : [];
          const catId = String(p.categoryId || p.categorySlug || '').toLowerCase().trim();
          const catSlug = String(p.categorySlug || p.cat || '').toLowerCase().trim();
          return cids.includes(catId) || cids.includes(catSlug);
        }
        return false;
      };

      // 3. Process items and calculate pricing
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

        // Apply active automatic campaigns if eligible
        let bestAutoCampaignPrice = basePrice;
        let appliedAutoCampaign: any = null;

        for (const camp of activeAutomaticCampaigns) {
          if (checkEligibility({ id: item.id, ...product }, camp)) {
            let campPrice = retail;
            if (camp.discountType === 'percentage') {
              campPrice = retail * (1 - Number(camp.discountValue || 0) / 100);
            } else if (camp.discountType === 'fixed') {
              campPrice = Math.max(0.01, retail - Number(camp.discountValue || 0));
            }
            if (campPrice < bestAutoCampaignPrice) {
              bestAutoCampaignPrice = campPrice;
              appliedAutoCampaign = camp;
            }
          }
        }

        basePrice = bestAutoCampaignPrice;

        // Apply coupon-based campaign if eligible
        let isEligibleForCoupon = false;
        let finalPrice = basePrice;

        if (matchedCouponCampaign && checkEligibility({ id: item.id, ...product }, matchedCouponCampaign)) {
          isEligibleForCoupon = true;
          let couponCampPrice = retail;
          if (matchedCouponCampaign.discountType === 'percentage') {
            couponCampPrice = retail * (1 - Number(matchedCouponCampaign.discountValue || 0) / 100);
          } else if (matchedCouponCampaign.discountType === 'fixed') {
            couponCampPrice = Math.max(0.01, retail - Number(matchedCouponCampaign.discountValue || 0));
          }
          finalPrice = Math.min(finalPrice, couponCampPrice);
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
          autoCampaignId: appliedAutoCampaign?.id || null
        });
      }

      // 4. Validate coupon campaign limits
      let discountAmount = 0;
      let discountSnapshot: any = null;

      if (matchedCouponCampaign) {
        const minOrder = Number(matchedCouponCampaign.minimumOrder || 0);
        if (minOrder > 0 && eligibleSubtotalForCoupon < minOrder) {
          throw new Error(`Minimum order of $${minOrder.toFixed(2)} is required for coupon ${matchedCouponCampaign.couponCode}.`);
        }
        
        // Compute coupon discount amount
        if (matchedCouponCampaign.discountType === 'percentage') {
          discountAmount = eligibleSubtotalForCoupon * (Number(matchedCouponCampaign.discountValue) / 100);
        } else if (matchedCouponCampaign.discountType === 'fixed') {
          discountAmount = Math.min(eligibleSubtotalForCoupon, Number(matchedCouponCampaign.discountValue));
        }

        discountSnapshot = {
          type: matchedCouponCampaign.discountType,
          value: Number(matchedCouponCampaign.discountValue),
          campaignName: matchedCouponCampaign.internalName || matchedCouponCampaign.heading,
        };
      } else if (standalonePromo) {
        const minOrder = Number(standalonePromo.minOrder || 0);
        if (minOrder > 0 && rawSubtotal < minOrder) {
          throw new Error(`Minimum order of $${minOrder.toFixed(2)} is required for code ${standalonePromo.code}.`);
        }
        
        if (standalonePromo.type === 'percentage') {
          discountAmount = rawSubtotal * (Number(standalonePromo.value) / 100);
        } else if (standalonePromo.type === 'fixed') {
          discountAmount = Math.min(rawSubtotal, Number(standalonePromo.value));
        }

        discountSnapshot = {
          type: standalonePromo.type,
          value: Number(standalonePromo.value),
          campaignName: `Coupon Code: ${standalonePromo.code}`,
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
        campaignId: matchedCouponCampaign?.id || null,
        promoCodeApplied: promoCodeApplied || null,
        eligibleSubtotal: Number((matchedCouponCampaign ? eligibleSubtotalForCoupon : rawSubtotal).toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        discountSnapshot: discountSnapshot || null
      };

      // 5. Update stock and complete transactions
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

      transaction.set(doc(db, 'orders', orderId), orderData);
      return orderData;
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('[API POST /api/checkout] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Checkout transaction failed.' }, { status: 409 });
  }
}
