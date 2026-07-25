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
        name: 'What are the delivery charges and shipping times across Pakistan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We offer free delivery across Pakistan on all products. Orders are shipped through TCS and delivered within 3–7 business days.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is your exchange and return policy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We offer a 2-day return and exchange policy from the date of delivery for unused items in original packaging with tags attached.',
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
