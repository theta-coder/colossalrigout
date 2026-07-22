import React from 'react';
import { Metadata } from 'next';
import ReturnsClient from '@/components/policies/ReturnsClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Returns & Exchanges Policy',
  description: 'Read the Colossal Rigout 7-day return and exchange policy. Easy returns, item condition rules, and refund processing in Pakistan.',
  keywords: [
    'Returns Policy Pakistan',
    'Colossal Rigout Exchange',
    'Item Return Eligibility',
    'Pakistani Fashion Refund',
  ],
  alternates: {
    canonical: `${siteUrl}/returns`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/returns`,
    title: 'Returns & Exchanges Policy | Colossal Rigout',
    description: 'Read the Colossal Rigout 7-day return and exchange policy in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Returns & Exchanges Policy | Colossal Rigout',
    description: 'Read the Colossal Rigout 7-day return and exchange policy in Pakistan.',
  },
};

export default function ReturnsPage() {
  return <ReturnsClient />;
}
