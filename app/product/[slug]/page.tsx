import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getProductBySlug,
  getColorsByIds,
  getProductPolicySummary,
  getActivePromoCampaigns,
} from '@/lib/server/products';
import { getRelatedProducts } from '@/lib/server/product-recommendations';
import { getProductColorGalleries } from '@/lib/server/product-galleries';
import ProductDetailsClient from '@/components/product/ProductDetailsClient';
import { getEffectiveProductPrice } from '@/lib/shop-filters';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found | Colossal Rigout',
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';
  const title = `${product.name} | Colossal Rigout`;
  const description = (product.description || `Buy ${product.name} at Colossal Rigout. Premium quality apparel with nationwide fast delivery in Pakistan.`)
    .slice(0, 160)
    .replace(/\s+/g, ' ')
    .trim();

  const imageUrl = product.img.startsWith('http')
    ? product.img
    : `${siteUrl}${product.img.startsWith('/') ? '' : '/'}${product.img}`;

  const canonicalUrl = `${siteUrl}/product/${product.slug || slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonicalUrl,
      siteName: 'Colossal Rigout',
      images: [{ url: imageUrl, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';
  const [colors, policySummary, relatedProducts, galleries, activeCampaigns] = await Promise.all([
    getColorsByIds(product.colorIds || []),
    getProductPolicySummary(),
    getRelatedProducts(product, 4),
    getProductColorGalleries(String(product.id)),
    getActivePromoCampaigns(),
  ]);

  const effPrice = getEffectiveProductPrice(product);

  // Schema.org Product JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Buy ${product.name} online at Colossal Rigout.`,
    image: [product.img.startsWith('http') ? product.img : `${siteUrl}${product.img.startsWith('/') ? '' : '/'}${product.img}`],
    sku: String(product.id),
    brand: {
      '@type': 'Brand',
      name: 'Colossal Rigout',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: String(effPrice),
      availability: (product.totalStock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/product/${product.slug || slug}`,
    },
    ...(Number(product.reviews || 0) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(product.rating || '5.0'),
            reviewCount: String(product.reviews || '1'),
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailsClient
        product={product}
        availableColors={colors}
        policySummary={policySummary}
        relatedProducts={relatedProducts}
        galleriesByColorId={galleries.galleriesByColorId}
        initialActiveCampaigns={activeCampaigns}
      />
    </>
  );
}
