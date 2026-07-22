import React from 'react';
import { Metadata } from 'next';
import ContactClient from '@/components/contact/ContactClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Contact Us | Customer Support & Store Inquiries',
  description: 'Get in touch with Colossal Rigout customer support team. Reach us for order assistance, shipping queries, and store locations in Pakistan.',
  keywords: [
    'Contact Colossal Rigout',
    'Customer Support Pakistan',
    'Colossal Rigout Helpline',
    'Lahore Store Location',
  ],
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/contact`,
    title: 'Contact Us | Colossal Rigout',
    description: 'Get in touch with Colossal Rigout customer support team in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | Colossal Rigout',
    description: 'Get in touch with Colossal Rigout customer support team in Pakistan.',
  },
};

export default function ContactPage() {
  const contactPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Colossal Rigout',
    description: 'Get in touch with Colossal Rigout customer support team for order assistance and store inquiries.',
    url: `${siteUrl}/contact`,
    mainEntity: {
      '@type': 'Organization',
      name: 'Colossal Rigout',
      url: siteUrl,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'support@colossalrigout.pk',
        areaServed: 'PK',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }}
      />
      <ContactClient />
    </>
  );
}
