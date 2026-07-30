import React from 'react';
import { Metadata } from 'next';
import ShippingPolicyClient from '@/components/policies/ShippingPolicyClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy | Colossal Rigout',
  description: 'Learn about Colossal Rigout nationwide shipping policy in Pakistan. Standard shipping Rs. 250; free delivery on orders of Rs. 2,500 or more via TCS.',
  keywords: [
    'Shipping Policy Pakistan',
    'Colossal Rigout Delivery',
    'Free Shipping Over 2500',
    'Order Dispatch Timelines',
  ],
  alternates: {
    canonical: `${siteUrl}/shipping-policy`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/shipping-policy`,
    title: 'Shipping & Delivery Policy | Colossal Rigout',
    description: 'Learn about Colossal Rigout nationwide shipping policy in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shipping & Delivery Policy | Colossal Rigout',
    description: 'Learn about Colossal Rigout nationwide shipping policy in Pakistan.',
  },
};

export default function ShippingPolicyPage() {
  return <ShippingPolicyClient />;
}
