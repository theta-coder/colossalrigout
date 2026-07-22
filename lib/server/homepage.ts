/**
 * lib/server/homepage.ts
 * 
 * Server-side Firestore helpers for the homepage Server Component.
 * Uses stateless server-native REST queries with Next.js fetch caching & tags.
 * Eliminates browser SDK state pollution in RSC payloads and enables ISR caching.
 */

import { fetchFirestoreRestCollection } from './firestore-rest';
import { cache } from 'react';

/* ─────────────── Types ─────────────── */

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  btn1Text: string;
  btn1Link: string;
  btn2Text: string;
  btn2Link: string;
  order: number;
}

export interface HomepageCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  order: number;
  active: boolean;
  style: 'image' | 'sale';
}

export interface ProductCardData {
  id: number | string;
  name: string;
  slug?: string;
  img: string;
  price: number;
  retailPrice?: number;
  discountPrice?: number | null;
  colors: string[];
  sizes: string[];
  rating?: string;
  sold?: string;
  isBestseller?: boolean;
  cat?: string;
  description?: string;
  images?: string[];
  imageIds?: string[];
  colorIds?: string[];
  sizeIds?: string[];
  collectionIds?: string[];
  sizeGuideId?: string | null;
  totalStock?: number;
  collections?: string[];
  reviews?: string;
  audienceId?: string;
  audienceSlug?: string;
}

export interface HomepageCampaign {
  id: string;
  badgeText: string;
  heading: string;
  description: string;
  highlightText: string;
  ctaText: string;
  discountMode: string;
  discountType: string;
  discountValue: number;
  couponCode: string;
  startsAt: string;
  endsAt: string;
  targetType: string;
  productIds: string[];
  categoryIds: string[];
  backgroundImageUrl: string;
  backgroundOverlayOpacity: number;
  textAlignment: string;
  order: number;
}

export interface HomepageCampaignCard {
  id: string;
  cardType: string;
  eyebrowText: string;
  heading: string;
  description: string;
  buttonText: string;
  overlayOpacity: number;
  textPosition: string;
  actionType: string;
  productId: string;
  collectionId: string;
  storeId: string;
  internalPath: string;
  hasDiscount: boolean;
  promotionId: string;
  backgroundImageUrl: string;
  startsAt: string;
  endsAt: string;
  order: number;
}

export interface HomepageCollection {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  img: string;
}

export interface HomepageReview {
  id: string;
  productId: string;
  productNameSnapshot: string;
  productSlugSnapshot: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  images?: string[];
  createdAt: string;
  moderatedAt: string | null;
}

export interface HomepageTrustBenefit {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  order: number;
}

/* ─────────────── Helper: image URL generator ─────────────── */

const isBase64Image = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith('data:image/') && v.length <= 800_000;

const homepageImageUrl = (kind: string, id: string) =>
  `/api/homepage-image/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`;

/* ─────────────── 1. Hero Slides ─────────────── */

export async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  try {
    const docs = await fetchFirestoreRestCollection({
      collectionName: 'hero-slides',
      tags: ['homepage', 'homepage:hero'],
    });

    const slides: HeroSlide[] = docs.map(d => ({
      id: d.id,
      title: String(d.data.title || ''),
      subtitle: String(d.data.subtitle || ''),
      image: homepageImageUrl('hero', d.id),
      btn1Text: String(d.data.btn1Text || 'SHOP NOW'),
      btn1Link: String(d.data.btn1Link || '/shop'),
      btn2Text: String(d.data.btn2Text || ''),
      btn2Link: String(d.data.btn2Link || ''),
      order: Number(d.data.order) || 0,
    }));

    slides.sort((a, b) => a.order - b.order);
    return slides;
  } catch (e) {
    console.error('[homepage] getActiveHeroSlides error:', e);
    return [];
  }
}

/* ─────────────── 2. Categories ─────────────── */

export async function getHomepageCategories(): Promise<HomepageCategory[]> {
  try {
    const docs = await fetchFirestoreRestCollection({
      collectionName: 'shop-categories',
      tags: ['homepage', 'homepage:categories'],
    });

    const cats: HomepageCategory[] = [];
    for (const d of docs) {
      if (d.data.active === false) continue;
      cats.push({
        id: d.id,
        name: String(d.data.name || ''),
        slug: String(d.data.slug || ''),
        imageUrl: d.data.style === 'sale' ? '' : homepageImageUrl('category', d.id),
        order: Number(d.data.order) || 0,
        active: true,
        style: d.data.style === 'sale' ? 'sale' : 'image',
      });
    }

    cats.sort((a, b) => a.order - b.order);
    return cats;
  } catch (e) {
    console.error('[homepage] getHomepageCategories error:', e);
    return [];
  }
}

/* ─────────────── 3. Products (New Arrivals + Best Sellers) ─────────────── */

async function getHomepageProductsUncached(): Promise<{
  newArrivals: ProductCardData[];
  bestSellers: ProductCardData[];
}> {
  try {
    const [productsDocs, colorsDocs, sizesDocs] = await Promise.all([
      fetchFirestoreRestCollection({
        collectionName: 'products',
        tags: ['homepage', 'homepage:products'],
      }),
      fetchFirestoreRestCollection({
        collectionName: 'colors',
        tags: ['homepage', 'homepage:colors'],
      }),
      fetchFirestoreRestCollection({
        collectionName: 'sizes',
        tags: ['homepage', 'homepage:sizes'],
      }),
    ]);

    const colorNames = new Map(colorsDocs.map(d => [d.id, String(d.data.name || d.id)]));
    const sizeNames = new Map(sizesDocs.map(d => [d.id, String(d.data.code || d.data.name || d.id)]));

    const placeholder = '/product-placeholder.png';
    const allProducts: ProductCardData[] = productsDocs
      .filter(d => d.id !== '_schema' && d.data.type !== 'collection-schema')
      .map(d => {
        const data = d.data;
        const imageIds = Array.isArray(data.imageIds) ? data.imageIds.map(String) : [];
        const images = imageIds.map((id: string) => homepageImageUrl('product', id));
        const retailPrice = Number(data.retailPrice ?? data.price ?? 0);
        const discountPrice = data.discountPrice ? Number(data.discountPrice) : null;

        return {
          id: /^\d+$/.test(d.id) ? Number(d.id) : d.id,
          name: String(data.name || ''),
          slug: data.slug || '',
          img: images[0] || placeholder,
          images: images.length ? images : [placeholder],
          imageIds,
          price: discountPrice || retailPrice,
          retailPrice,
          discountPrice,
          colors: (data.colorIds || data.colors || []).map((id: string) => colorNames.get(id) || id),
          sizes: (data.sizeIds || data.sizes || []).map((id: string) => sizeNames.get(id) || id),
          cat: data.cat || data.categorySlug || '',
          description: data.description || '',
          collections: data.collections || data.collectionIds || [],
          colorIds: data.colorIds || [],
          sizeIds: data.sizeIds || [],
          collectionIds: data.collectionIds || [],
          sizeGuideId: data.sizeGuideId || null,
          totalStock: Number(data.totalStock || 0),
          isBestseller: Boolean(data.bestsellerOverride),
          rating: data.aggregateRating ? String(data.aggregateRating) : undefined,
          reviews: data.approvedReviewCount ? String(data.approvedReviewCount) : undefined,
          sold: data.soldUnits ? `${data.soldUnits} sold` : undefined,
          audienceId: data.audienceId || '',
          audienceSlug: data.audienceSlug || '',
        };
      });

    // New Arrivals: latest 10
    const newArrivals = allProducts.slice().reverse().slice(0, 10);

    // Best Sellers: marked as bestseller or top 10 fallback
    const marked = allProducts.filter(p => p.isBestseller);
    const bestSellers = marked.length > 0 ? marked.slice(0, 10) : allProducts.slice(0, 10);

    return { newArrivals, bestSellers };
  } catch (e) {
    console.error('[homepage] getHomepageProducts error:', e);
    return { newArrivals: [], bestSellers: [] };
  }
}

// React cache() deduplicates reads between New Arrivals & Best Sellers components per request
export const getHomepageProducts = cache(getHomepageProductsUncached);

/* ─────────────── 4. Active Promo Campaign ─────────────── */

export async function getActivePromoCampaign(): Promise<{
  campaign: HomepageCampaign | null;
  serverNow: string;
}> {
  const serverNow = new Date().toISOString();
  try {
    const nowMs = Date.now();
    const docs = await fetchFirestoreRestCollection({
      collectionName: 'promo-campaigns',
      tags: ['homepage', 'homepage:promo'],
    });

    const activeCampaigns: HomepageCampaign[] = [];

    for (const d of docs) {
      const data = d.data;
      if (d.id === '_schema' || data.type === 'collection-schema') continue;
      if (data.status !== 'active') continue;

      const startsMs = new Date(data.startsAt).getTime();
      const endsMs = new Date(data.endsAt).getTime();
      if (nowMs < startsMs || nowMs >= endsMs) continue;

      activeCampaigns.push({
        id: d.id,
        badgeText: data.badgeText || '',
        heading: data.heading || '',
        description: data.description || '',
        highlightText: data.highlightText || '',
        ctaText: data.ctaText || 'Shop Now',
        discountMode: data.discountMode || 'automatic',
        discountType: data.discountType || 'percentage',
        discountValue: Number(data.discountValue || 0),
        couponCode: data.couponCode || '',
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        targetType: data.targetType || 'all-products',
        productIds: data.productIds || [],
        categoryIds: data.categoryIds || [],
        backgroundImageUrl: homepageImageUrl('promo', d.id),
        backgroundOverlayOpacity: Number(data.backgroundOverlayOpacity ?? 0.55),
        textAlignment: data.textAlignment || 'left',
        order: Number(data.order || 0),
      });
    }

    activeCampaigns.sort((a, b) => a.order - b.order);
    return { campaign: activeCampaigns[0] || null, serverNow };
  } catch (e) {
    console.error('[homepage] getActivePromoCampaign error:', e);
    return { campaign: null, serverNow };
  }
}

/* ─────────────── 5. Campaign Cards ─────────────── */

export async function getActiveCampaignCards(): Promise<HomepageCampaignCard[]> {
  try {
    const nowMs = Date.now();
    const [cardDocs, promoDocs, storeDocs] = await Promise.all([
      fetchFirestoreRestCollection({
        collectionName: 'campaign-cards',
        tags: ['homepage', 'homepage:campaign-cards'],
      }),
      fetchFirestoreRestCollection({
        collectionName: 'promotions',
        tags: ['homepage', 'homepage:promotions'],
      }),
      fetchFirestoreRestCollection({
        collectionName: 'stores',
        tags: ['homepage', 'homepage:stores'],
      }),
    ]);

    const promotions = new Map(promoDocs.map(d => [d.id, d.data]));
    const stores = new Map(storeDocs.map(d => [d.id, d.data]));
    const cards: HomepageCampaignCard[] = [];

    for (const d of cardDocs) {
      const data = d.data;
      if (data.status !== 'active') continue;

      const startsMs = new Date(data.startsAt).getTime();
      const endsMs = new Date(data.endsAt).getTime();
      if (nowMs < startsMs || nowMs >= endsMs) continue;

      const promotion = data.promotionId ? promotions.get(String(data.promotionId)) : undefined;
      const store = data.storeId ? stores.get(String(data.storeId)) : undefined;
      const remainingUses = promotion?.globalUsageLimit
        ? Math.max(0, Number(promotion.globalUsageLimit) - Number(promotion.usedCount || 0))
        : '';
      const discount = promotion
        ? promotion.discountType === 'percentage'
          ? `${Number(promotion.discountValue || 0)}% OFF`
          : promotion.discountType === 'fixed'
            ? `$${Number(promotion.discountValue || 0)} OFF`
            : 'FREE SHIPPING'
        : '';
      const tokens: Record<string, string> = {
        discount,
        coupon: String(promotion?.couponCode || ''),
        remainingUses: String(remainingUses),
        storeName: String(store?.name || ''),
      };
      const interpolate = (v: unknown) =>
        String(v || '').replace(/\{\{(discount|coupon|remainingUses|storeName)\}\}/g, (_, key) => tokens[key]);

      cards.push({
        id: d.id,
        cardType: data.cardType || 'discount',
        eyebrowText: interpolate(data.eyebrowText),
        heading: interpolate(data.heading),
        description: interpolate(data.description),
        buttonText: interpolate(data.buttonText),
        overlayOpacity: Number(data.overlayOpacity ?? 0.4),
        textPosition: data.textPosition || 'bottom-left',
        actionType: data.actionType || 'campaign-products',
        productId: data.productId || '',
        collectionId: data.collectionId || '',
        storeId: data.storeId || '',
        internalPath: typeof data.internalPath === 'string' && data.internalPath.startsWith('/') && !data.internalPath.startsWith('//') && !data.internalPath.includes('\\') ? data.internalPath : '',
        hasDiscount: !!data.hasDiscount,
        promotionId: data.promotionId || '',
        backgroundImageUrl: homepageImageUrl('campaign-card', d.id),
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        order: Number(data.order || 0),
      });
    }

    cards.sort((a, b) => a.order - b.order);
    return cards;
  } catch (e) {
    console.error('[homepage] getActiveCampaignCards error:', e);
    return [];
  }
}

/* ─────────────── 6. Featured Collections ─────────────── */

export async function getFeaturedCollections(): Promise<HomepageCollection[]> {
  try {
    const docs = await fetchFirestoreRestCollection({
      collectionName: 'collections',
      tags: ['homepage', 'homepage:collections'],
    });

    const colls: HomepageCollection[] = [];
    for (const d of docs) {
      const data = d.data;
      if (data.active === false || data.featuredOnHome === false) continue;
      colls.push({
        id: d.id,
        title: data.name || '',
        subtitle: data.subtitle || '',
        slug: data.slug || '',
        img: isBase64Image(data.imageData) ? homepageImageUrl('collection', d.id) : '/colossal-rigout-logo.png',
      });
    }

    colls.sort((a, b) => Number((a as any).order || 0) - Number((b as any).order || 0));
    return colls;
  } catch (e) {
    console.error('[homepage] getFeaturedCollections error:', e);
    return [];
  }
}

/* ─────────────── 7. Latest Approved Reviews ─────────────── */

export async function getLatestApprovedReviews(): Promise<HomepageReview[]> {
  try {
    const docs = await fetchFirestoreRestCollection({
      collectionName: 'reviews',
      tags: ['homepage', 'homepage:reviews'],
    });

    const approved: HomepageReview[] = [];
    for (const d of docs) {
      const data = d.data;
      if (data.status !== 'approved') continue;

      approved.push({
        id: data.id || d.id,
        productId: data.productId,
        productNameSnapshot: data.productNameSnapshot || '',
        productSlugSnapshot: data.productSlugSnapshot || '',
        customerName: data.customerName || 'Anonymous',
        rating: Number(data.rating) || 5,
        title: data.title || '',
        body: data.body || '',
        verifiedPurchase: Boolean(data.verifiedPurchase),
        images: Array.isArray(data.images) ? data.images : [],
        createdAt: data.createdAt || '',
        moderatedAt: data.moderatedAt || null,
      });
    }

    approved.sort((a, b) => {
      const tA = new Date(a.moderatedAt || a.createdAt).getTime();
      const tB = new Date(b.moderatedAt || b.createdAt).getTime();
      return tB - tA;
    });

    return approved.slice(0, 5);
  } catch (e) {
    console.error('[homepage] getLatestApprovedReviews error:', e);
    return [];
  }
}

/* ─────────────── 8. Trust Benefits ─────────────── */

export async function getActiveTrustBenefits(): Promise<HomepageTrustBenefit[]> {
  try {
    const docs = await fetchFirestoreRestCollection({
      collectionName: 'trust-benefits',
      tags: ['homepage', 'homepage:trust-benefits'],
    });

    const benefits: HomepageTrustBenefit[] = [];
    for (const d of docs) {
      const data = d.data;
      if (data.active === false) continue;
      benefits.push({
        id: d.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        icon: data.icon || 'shield',
        order: Number(data.order) || 0,
      });
    }

    benefits.sort((a, b) => a.order - b.order);
    return benefits;
  } catch (e) {
    console.error('[homepage] getActiveTrustBenefits error:', e);
    return [];
  }
}
