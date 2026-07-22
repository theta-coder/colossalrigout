import React from 'react';
import { Metadata } from 'next';
import FaqClient from '@/components/faq/FaqClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions (FAQ) | Shipping, Returns & Orders',
  description: 'Find quick answers to common questions about Colossal Rigout orders, shipping policies, returns, sizing, and payment methods in Pakistan.',
  keywords: [
    'Colossal Rigout FAQ',
    'Clothing Shipping Pakistan',
    'Return Policy Help',
    'Order Delivery Status',
  ],
  alternates: {
    canonical: `${siteUrl}/faq`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/faq`,
    title: 'Frequently Asked Questions (FAQ) | Colossal Rigout',
    description: 'Find quick answers to common questions about Colossal Rigout orders, shipping policies, and returns.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frequently Asked Questions (FAQ) | Colossal Rigout',
    description: 'Find quick answers to common questions about Colossal Rigout orders, shipping policies, and returns.',
  },
};

export default function FaqPage() {
  const faqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What are the delivery charges across Pakistan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We offer nationwide shipping across Pakistan. Orders over PKR 5,000 qualify for free delivery.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is your exchange and return policy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We offer a hassle-free return and exchange policy within 7 days of delivery for unused items with original tags.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
      />
      <FaqClient />
    </>
  );
}
