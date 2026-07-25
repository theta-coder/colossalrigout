import React from 'react';
import { Metadata } from 'next';
import ReturnsClient from '@/components/policies/ReturnsClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Returns & Exchanges Policy | Colossal Rigout',
  description: 'Read the Colossal Rigout 12-hour return and exchange policy. Eligible items, exchange rules, refund timelines, and return instructions in Pakistan.',
  keywords: [
    'Returns Policy Pakistan',
    'Colossal Rigout Exchange',
    '12 Hour Return Policy',
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
    description: 'Read the Colossal Rigout 12-hour return and exchange policy in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Returns & Exchanges Policy | Colossal Rigout',
    description: 'Read the Colossal Rigout 12-hour return and exchange policy in Pakistan.',
  },
};

export default function ReturnsPage() {
  return <ReturnsClient />;
}
