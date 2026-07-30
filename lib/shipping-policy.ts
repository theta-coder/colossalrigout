export type ShippingPolicyIcon = 'truck' | 'dollar' | 'package' | 'globe' | 'alert';

export interface ShippingPolicySettings {
  id: 'settings';
  pageTitle: string;
  intro: string;
  freeShippingEnabled?: boolean;
  freeShippingThreshold?: number; // in PKR
  flatRateEnabled?: boolean;
  flatRate?: number; // in PKR
  deliveryMinBusinessDays?: number;
  deliveryMaxBusinessDays?: number;
  productPageEnabled?: boolean;
  productPageNote?: string;
  updatedAt?: string;
}

export interface ShippingPolicySection {
  id: string;
  title: string;
  description: string;
  icon: ShippingPolicyIcon;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const defaultShippingSettings: ShippingPolicySettings = {
  id: 'settings',
  pageTitle: 'SHIPPING POLICY',
  intro: 'Standard shipping charges are Rs. 250 across Pakistan. Enjoy free nationwide shipping on all orders of Rs. 2,500 or more via TCS in 3–7 business days.',
  freeShippingEnabled: true,
  freeShippingThreshold: 2500,
  flatRateEnabled: true,
  flatRate: 250,
  deliveryMinBusinessDays: 3,
  deliveryMaxBusinessDays: 7,
  productPageEnabled: true,
  productPageNote: 'Shipping Rs. 250. Free nationwide shipping on orders of Rs. 2,500 or more.',
};

/**
 * Shared shipping fee calculation engine.
 * - Subtotal == 0 (empty cart): Rs. 0
 * - Subtotal >= freeShippingThreshold (default 2500) and freeShippingEnabled: Rs. 0
 * - Valid free shipping promotion/coupon: Rs. 0
 * - Subtotal < 2500 and flatRateEnabled: flatRate (default 250)
 */
export function calculateShippingFee(
  subtotal: number,
  settings: Partial<ShippingPolicySettings> = defaultShippingSettings,
  hasFreeShippingPromotion: boolean = false
): number {
  if (!subtotal || subtotal <= 0) return 0;
  if (hasFreeShippingPromotion) return 0;

  const freeEnabled = settings.freeShippingEnabled ?? defaultShippingSettings.freeShippingEnabled ?? true;
  const freeThreshold = settings.freeShippingThreshold ?? defaultShippingSettings.freeShippingThreshold ?? 2500;

  if (freeEnabled && freeThreshold > 0 && subtotal >= freeThreshold) {
    return 0;
  }

  const flatEnabled = settings.flatRateEnabled ?? defaultShippingSettings.flatRateEnabled ?? true;
  const flatRate = settings.flatRate ?? defaultShippingSettings.flatRate ?? 250;

  if (flatEnabled) {
    return flatRate;
  }

  return 0;
}

export function calculateRemainingForFreeShipping(
  subtotal: number,
  settings: Partial<ShippingPolicySettings> = defaultShippingSettings
): number {
  const freeEnabled = settings.freeShippingEnabled ?? defaultShippingSettings.freeShippingEnabled ?? true;
  const freeThreshold = settings.freeShippingThreshold ?? defaultShippingSettings.freeShippingThreshold ?? 2500;

  if (!freeEnabled || freeThreshold <= 0) return 0;
  return Math.max(0, freeThreshold - subtotal);
}

