import React from 'react';
import { Metadata } from 'next';
import ReturnsClient from '@/components/policies/ReturnsClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Returns & Exchanges Policy | Colossal Rigout',
  description: 'Read the Colossal Rigout 2-day return and exchange policy. Learn about item eligibility, non-returnable items, exchange policy, refunds, return shipping costs, and step-by-step return instructions in Pakistan.',
  keywords: [
    'Returns & Exchanges Pakistan',
    'Colossal Rigout Return Policy',
    '2 Day Return Window',
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
    description: 'Read the Colossal Rigout 2-day return and exchange policy in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Returns & Exchanges Policy | Colossal Rigout',
    description: 'Read the Colossal Rigout 2-day return and exchange policy in Pakistan.',
  },
};

export default function ReturnsPage() {
  return <ReturnsClient />;
}
