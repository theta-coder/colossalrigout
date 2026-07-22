import React from 'react';
import { Metadata } from 'next';
import AboutClient from '@/components/about/AboutClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'About Us | Our Craft & Vision',
  description: 'Learn about Colossal Rigout, Pakistan’s premium fashion brand dedicated to modern apparel, craftsmanship, and empowering style.',
  keywords: [
    'About Colossal Rigout',
    'Fashion Brand Pakistan',
    'Clothing Craftsmanship',
    'Pakistani Apparel Vision',
  ],
  alternates: {
    canonical: `${siteUrl}/about`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/about`,
    title: 'About Us | Colossal Rigout',
    description: 'Learn about Colossal Rigout, Pakistan’s premium fashion brand dedicated to modern apparel and empowering style.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | Colossal Rigout',
    description: 'Learn about Colossal Rigout, Pakistan’s premium fashion brand dedicated to modern apparel and empowering style.',
  },
};

export default function AboutPage() {
  const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Colossal Rigout',
    description: 'Learn about Colossal Rigout, Pakistan’s premium fashion brand dedicated to modern apparel and empowering style.',
    url: `${siteUrl}/about`,
    mainEntity: {
      '@type': 'Organization',
      name: 'Colossal Rigout',
      url: siteUrl,
      logo: `${siteUrl}/colossal-rigout-logo.png`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
      />
      <AboutClient />
    </>
  );
}
