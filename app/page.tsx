import React, { Suspense } from 'react';
import HeroSection from '@/components/home/HeroSection';
import CategorySection from '@/components/home/CategorySection';
import ProductSection from '@/components/home/ProductSection';
import PromoCampaignSection from '@/components/home/PromoCampaignSection';
import CampaignCardsSection from '@/components/home/CampaignCardsSection';
import CollectionsSection from '@/components/home/CollectionsSection';
import ReviewsSection from '@/components/home/ReviewsSection';
import TrustBenefitsSection from '@/components/home/TrustBenefitsSection';
import NewsletterFormClient from '@/components/home/NewsletterFormClient';
import { getNewsletterSettings } from '@/lib/server/storefront-settings';

import { HeroSkeleton } from '@/components/home/skeletons/HeroSkeleton';
import { CategoriesSkeleton } from '@/components/home/skeletons/CategoriesSkeleton';
import { ProductRowSkeleton } from '@/components/home/skeletons/ProductRowSkeleton';
import { PromoSkeleton } from '@/components/home/skeletons/PromoSkeleton';
import { CollectionsSkeleton } from '@/components/home/skeletons/CollectionsSkeleton';
import { ReviewsSkeleton } from '@/components/home/skeletons/ReviewsSkeleton';
import { TrustBenefitsSkeleton } from '@/components/home/skeletons/TrustBenefitsSkeleton';

import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  title: 'Colossal Rigout | Premium Men Fashion & Apparel in Pakistan',
  description: 'Shop modern menswear, luxury casuals, shirts, t-shirts, and bottoms online in Pakistan. Free shipping on orders over PKR 5,000.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'Colossal Rigout | Premium Men Fashion & Apparel in Pakistan',
    description: 'Shop modern menswear, luxury casuals, shirts, t-shirts, and bottoms online in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Colossal Rigout | Premium Men Fashion & Apparel in Pakistan',
    description: 'Shop modern menswear, luxury casuals, shirts, t-shirts, and bottoms online in Pakistan.',
  },
};

// Server-native data fetching via firestore-rest enables incremental static revalidation
// with tag-based cache invalidation on admin mutations.
export const revalidate = 3600;

export default async function Home() {
  const newsletterSettings = await getNewsletterSettings();

  return (
    <div className="flex flex-col gap-0">
      {/* 1. HERO SECTION */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>

      {/* 2. SHOP BY CATEGORY */}
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategorySection />
      </Suspense>

      {/* 3. NEW ARRIVALS */}
      <Suspense fallback={<ProductRowSkeleton />}>
        <ProductSection type="new-arrivals" />
      </Suspense>

      {/* 4. DYNAMIC PROMO CAMPAIGN BANNER */}
      <Suspense fallback={<PromoSkeleton />}>
        <PromoCampaignSection />
      </Suspense>

      {/* 5. BEST SELLERS */}
      <Suspense fallback={<ProductRowSkeleton />}>
        <ProductSection type="best-sellers" />
      </Suspense>

      {/* 6. PROMO CAMPAIGN CARDS CAROUSEL */}
      <Suspense fallback={null}>
        <CampaignCardsSection />
      </Suspense>

      {/* 7. EXPLORE COLLECTIONS */}
      <Suspense fallback={<CollectionsSkeleton />}>
        <CollectionsSection />
      </Suspense>

      {/* 8. REVIEWS / TESTIMONIALS */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsSection />
      </Suspense>

      {/* 9. TRUST BENEFITS STRIP */}
      <Suspense fallback={<TrustBenefitsSkeleton />}>
        <TrustBenefitsSection />
      </Suspense>

      {/* 10. NEWSLETTER */}
      <NewsletterFormClient settings={newsletterSettings} />
    </div>
  );
}
