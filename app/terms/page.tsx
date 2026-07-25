import React from 'react';
import { Metadata } from 'next';
import TermsClient from '@/components/policies/TermsClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Colossal Rigout',
  description: 'Read the official Terms & Conditions of Colossal Rigout. Understand store rules, order acceptance, pricing in PKR, shipping, returns, intellectual property, and Pakistani governing law.',
  keywords: [
    'Terms and Conditions Pakistan',
    'Colossal Rigout Terms of Service',
    'Online Store Rules',
    'E-commerce Terms Pakistan',
    'Store Policies',
  ],
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/terms`,
    title: 'Terms & Conditions | Colossal Rigout',
    description: 'Read the official Terms & Conditions of Colossal Rigout in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms & Conditions | Colossal Rigout',
    description: 'Read the official Terms & Conditions of Colossal Rigout in Pakistan.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return <TermsClient />;
}
