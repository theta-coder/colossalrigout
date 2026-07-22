/**
 * lib/server/commerce-pricing.ts
 * 
 * Server-side pricing, inventory validation, promotion valuation,
 * and shipping calculation engine for Cart Quote and Checkout.
 */

import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultShippingSettings, ShippingPolicySettings } from '@/lib/shipping-policy';

export interface CartQuoteInputItem {
  variantId?: string;
  productId?: string | number;
  colorId?: string;
  sizeId?: string;
  colorName?: string;
  sizeName?: string;
  qty: number;
}

export interface QuotedCartLine {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;
  img: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  availableStock: number;
  inStock: boolean;
}

export interface AppliedPromotionDetail {
  id: string;
  name: string;
  code: string | null;
  mode: 'automatic' | 'coupon';
  discountType: 'percentage' | 'fixed' | 'free-shipping';
  discountValue: number;
  discountAmount: number;
  publicMessage: string;
}

export interface CartQuoteResult {
  currency: 'PKR';
  lines: QuotedCartLine[];
  totalQty: number;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  remainingForFreeShipping: number;
  freeShippingThreshold: number;
  appliedPromotions: AppliedPromotionDetail[];
  couponStatus?: { code: string; valid: boolean; message: string };
  total: number;
}

export async function calculateCartQuote(
  rawItems: CartQuoteInputItem[],
  couponCodeInput?: string | null
): Promise<CartQuoteResult> {
  // Load products, inventory, shipping policy, promotions
  const [prodSnap, invSnap, shipSnap, promoSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'commerce/inventory')),
    getDoc(doc(db, 'shipping-policy-settings', 'settings')),
    getDocs(collection(db, 'promotions')),
  ]);

  const productsMap = new Map<string, any>();
  prodSnap.forEach((d) => productsMap.set(d.id, { id: d.id, ...d.data() }));

  const inventoryMap = new Map<string, any>();
  invSnap.forEach((d) => inventoryMap.set(d.id, { id: d.id, ...d.data() }));

  let shippingSettings: ShippingPolicySettings = defaultShippingSettings;
  if (shipSnap.exists()) {
    shippingSettings = { ...defaultShippingSettings, ...shipSnap.data() };
  }

  const freeThreshold = shippingSettings.freeShippingThreshold ?? 5000;
  const flatRate = shippingSettings.flatRate ?? 500;

  const lines: QuotedCartLine[] = [];
  let totalQty = 0;
  let subtotal = 0;

  for (const item of rawItems) {
    if (!item || item.qty <= 0) continue;

    const pId = String(item.productId || '');
    const pData = productsMap.get(pId) || Array.from(productsMap.values()).find((p) => String(p.id) === pId);

    if (!pData || pData.status === 'draft' || pData.status === 'archived') {
      continue;
    }

    const retail = Number(pData.retailPrice ?? pData.price ?? 0);
    const manualDiscount = pData.discountPrice ? Number(pData.discountPrice) : null;
    const effUnitPrice = manualDiscount && manualDiscount > 0 && manualDiscount < retail ? manualDiscount : retail;

    // Resolve inventory stock for variant
    const variantKey = item.variantId || `${pId}_${item.colorId || ''}_${item.sizeId || ''}`;
    const invData = inventoryMap.get(variantKey) || Array.from(inventoryMap.values()).find(
      (v) => String(v.productId) === pId && (v.colorId === item.colorId || v.colorName === item.colorName)
    );

    const availableStock = Number(
      invData?.availableStock ?? invData?.stockOnHand ?? pData.totalStock ?? 10
    );

    const clampedQty = Math.min(item.qty, Math.max(0, availableStock));
    const inStock = availableStock > 0 && clampedQty > 0;
    const lineTotal = effUnitPrice * (inStock ? clampedQty : item.qty);

    const colorName = item.colorName || (invData?.colorName) || (pData.colors?.[0]) || 'Default';
    const sizeName = item.sizeName || (invData?.sizeName) || (pData.sizes?.[0]) || 'M';
    const imgUrl = pData.primaryImageUrl || pData.img || '/colossal-rigout-logo.png';
    const slug = pData.slug || pId;

    lines.push({
      variantId: variantKey,
      productId: pId,
      productName: pData.name || 'Product',
      productSlug: slug,
      colorId: item.colorId || (invData?.colorId) || '',
      colorName,
      sizeId: item.sizeId || (invData?.sizeId) || '',
      sizeName,
      img: imgUrl,
      unitPrice: effUnitPrice,
      qty: inStock ? clampedQty : item.qty,
      lineTotal,
      availableStock,
      inStock,
    });

    if (inStock) {
      totalQty += clampedQty;
      subtotal += lineTotal;
    }
  }

  // Handle Coupon & Promotions Evaluation
  const appliedPromotions: AppliedPromotionDetail[] = [];
  let totalDiscountAmount = 0;
  let couponStatus: { code: string; valid: boolean; message: string } | undefined;

  const nowMs = Date.now();
  let activeAutoPromo: any = null;
  promoSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.status === 'active' && data.applicationMode === 'automatic') {
      const startsMs = new Date(data.startsAt).getTime();
      const endsMs = new Date(data.endsAt).getTime();
      if (nowMs >= startsMs && nowMs < endsMs) {
        activeAutoPromo = { id: docSnap.id, ...data };
      }
    }
  });

  const normalizedCode = couponCodeInput ? couponCodeInput.trim().toUpperCase() : null;

  if (normalizedCode && activeAutoPromo) {
    couponStatus = {
      code: normalizedCode,
      valid: false,
      message: 'An offer has already been applied. Only one promotion can be used at a time.',
    };
  } else if (normalizedCode) {
    let foundMatch: any = null;
    promoSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (String(data.code || data.couponCode || '').toUpperCase() === normalizedCode) {
        foundMatch = { id: docSnap.id, ...data };
      }
    });

    if (!foundMatch) {
      couponStatus = { code: normalizedCode, valid: false, message: `Coupon code '${normalizedCode}' is invalid.` };
    } else if (foundMatch.active === false || foundMatch.status === 'inactive') {
      couponStatus = { code: normalizedCode, valid: false, message: `Coupon code '${normalizedCode}' is currently inactive.` };
    } else {
      const minOrder = Number(foundMatch.minOrderAmount || foundMatch.minimumOrder || 0);
      if (subtotal < minOrder) {
        couponStatus = {
          code: normalizedCode,
          valid: false,
          message: `Minimum order of PKR ${minOrder.toLocaleString()} required for code '${normalizedCode}'.`,
        };
      } else {
        const discType = foundMatch.discountType || 'percentage';
        const discValue = Number(foundMatch.discountValue || 0);
        let calcAmount = 0;

        if (discType === 'percentage') {
          calcAmount = Math.round((subtotal * discValue) / 100);
        } else if (discType === 'fixed') {
          calcAmount = Math.min(subtotal, discValue);
        }

        totalDiscountAmount = calcAmount;
        const pubName = foundMatch.name || foundMatch.title || `Coupon (${normalizedCode})`;

        appliedPromotions.push({
          id: foundMatch.id,
          name: pubName,
          code: normalizedCode,
          mode: 'coupon',
          discountType: discType,
          discountValue: discValue,
          discountAmount: calcAmount,
          publicMessage: `${pubName} applied (${discType === 'percentage' ? `${discValue}% OFF` : `PKR ${discValue} OFF`})`,
        });

        couponStatus = {
          code: normalizedCode,
          valid: true,
          message: `Coupon '${normalizedCode}' applied successfully! Saved PKR ${calcAmount.toLocaleString()}.`,
        };
      }
    }
  }

  // Shipping calculation
  const remainingForFreeShipping = Math.max(0, freeThreshold - subtotal);
  const isFreeShipping = shippingSettings.freeShippingEnabled !== false && subtotal >= freeThreshold && subtotal > 0;
  const shippingAmount = isFreeShipping ? 0 : (subtotal > 0 ? flatRate : 0);

  const total = Math.max(0, subtotal + shippingAmount - totalDiscountAmount);

  return {
    currency: 'PKR',
    lines,
    totalQty,
    subtotal,
    discountAmount: totalDiscountAmount,
    shippingAmount,
    remainingForFreeShipping,
    freeShippingThreshold: freeThreshold,
    appliedPromotions,
    couponStatus,
    total,
  };
}
