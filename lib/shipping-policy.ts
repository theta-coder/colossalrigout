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
  intro: 'We strive to process and dispatch all orders promptly with reliable courier partners across Pakistan.',
  freeShippingEnabled: true,
  freeShippingThreshold: 5000,
  flatRateEnabled: true,
  flatRate: 500,
  deliveryMinBusinessDays: 4,
  deliveryMaxBusinessDays: 6,
  productPageEnabled: true,
  productPageNote: 'Item must be unworn with original tags attached.',
};
