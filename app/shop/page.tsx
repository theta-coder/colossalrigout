import React from 'react';
import { Metadata } from 'next';
import ShopClient from '@/components/shop/ShopClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Shop All Fashion Apparel & Catalog',
  description: 'Explore the complete Colossal Rigout catalog. Shop high-quality shirts, t-shirts, bottoms, shoes, and modern menswear in Pakistan.',
  keywords: [
    'Shop Apparel Pakistan',
    'Men Clothing Catalog',
    'Colossal Rigout Shop',
    'Pakistani Fashion Store',
    'Trendy Men Outfits',
  ],
  alternates: {
    canonical: `${siteUrl}/shop`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/shop`,
    title: 'Shop All Fashion Apparel | Colossal Rigout',
    description: 'Browse the latest collection of shirts, tops, and bottoms from Colossal Rigout.',
    images: [
      {
        url: `${siteUrl}/colossal-rigout-logo.png`,
        width: 1200,
        height: 630,
        alt: 'Colossal Rigout Shop Catalog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop All Fashion Apparel | Colossal Rigout',
    description: 'Browse the latest collection of shirts, tops, and bottoms from Colossal Rigout.',
  },
};

export default function ShopPage() {
  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Shop All Fashion Apparel',
    description: 'Explore the complete Colossal Rigout catalog of fashion apparel in Pakistan.',
    url: `${siteUrl}/shop`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Colossal Rigout',
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      <ShopClient />
    </>
  );
}
