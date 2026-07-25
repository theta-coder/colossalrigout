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
  intro: 'We offer free delivery across Pakistan on all products. Orders are shipped through TCS and delivered within 3–7 business days.',
  freeShippingEnabled: true,
  freeShippingThreshold: 0,
  flatRateEnabled: false,
  flatRate: 0,
  deliveryMinBusinessDays: 3,
  deliveryMaxBusinessDays: 7,
  productPageEnabled: true,
  productPageNote: 'Free nationwide delivery via TCS in 3–7 business days.',
};
