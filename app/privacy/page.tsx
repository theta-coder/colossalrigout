import React from 'react';
import { Metadata } from 'next';
import PrivacyClient from '@/components/policies/PrivacyClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Privacy Policy | Colossal Rigout',
  description: 'Read the official Privacy Policy of Colossal Rigout. Learn how we collect, protect, and handle your personal information, cookies, and order data in Pakistan.',
  keywords: [
    'Privacy Policy Pakistan',
    'Colossal Rigout Privacy Policy',
    'Data Protection',
    'Payment Security Pakistan',
    'Online Shopping Privacy',
  ],
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/privacy`,
    title: 'Privacy Policy | Colossal Rigout',
    description: 'Read the official Privacy Policy of Colossal Rigout in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | Colossal Rigout',
    description: 'Read the official Privacy Policy of Colossal Rigout in Pakistan.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
