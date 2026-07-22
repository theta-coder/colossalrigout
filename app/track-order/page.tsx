import React from 'react';
import { Metadata } from 'next';
import TrackOrderClient from '@/components/orders/TrackOrderClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Track Your Order | Real-Time Parcel Status',
  description: 'Track your Colossal Rigout order status in real time. Enter your Order ID or Courier tracking code to see dispatch and delivery updates in Pakistan.',
  keywords: [
    'Track Order Colossal Rigout',
    'Parcel Tracking Pakistan',
    'Order Delivery Status',
    'Courier Tracking Pakistan',
  ],
  alternates: {
    canonical: `${siteUrl}/track-order`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/track-order`,
    title: 'Track Your Order | Colossal Rigout',
    description: 'Track your Colossal Rigout order status in real time across Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Track Your Order | Colossal Rigout',
    description: 'Track your Colossal Rigout order status in real time across Pakistan.',
  },
};

export default function TrackOrderPage() {
  return <TrackOrderClient />;
}
