/**
 * lib/server/products.ts
 * 
 * Server data layer for product lookup, color resolution, policy summaries,
 * and review aggregate retrieval.
 */

import { cache } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProductDocument, ColorDocument } from '@/types/commerce';
import { Product as CatalogProduct } from '@/lib/products';
import { defaultShippingSettings, ShippingPolicySettings } from '@/lib/shipping-policy';
import { defaultSettings as defaultReturnsSettings, ReturnsPolicySettings } from '@/lib/returns-policy';

// Convert Firestore ProductDocument to CatalogProduct shape used across the app
export function formatProductDoc(docData: any, id: string): CatalogProduct {
  const name = docData.name || 'Unnamed Product';
  const slug = docData.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const retailPrice = Number(docData.retailPrice ?? docData.price ?? 0);
  const discountPrice = docData.discountPrice ? Number(docData.discountPrice) : null;
  const price = (discountPrice && discountPrice < retailPrice) ? discountPrice : retailPrice;

  return {
    id: isNaN(Number(id)) ? id as any : Number(id),
    name,
    price,
    retailPrice,
    discountPrice,
    img: docData.primaryImageUrl || docData.img || '/colossal-rigout-logo.png',
    images: (() => {
      const primaryImg = docData.primaryImageUrl || docData.img || '/colossal-rigout-logo.png';
      const list = Array.isArray(docData.images) && docData.images.length > 0 ? [...docData.images] : [primaryImg];
      if (list.length === 1) {
        if (!list.includes('/colossal-rigout-logo.png')) list.push('/colossal-rigout-logo.png');
        if (!list.includes('/product-placeholder.png')) list.push('/product-placeholder.png');
      }
      return list;
    })(),
    colors: Array.isArray(docData.colors) ? docData.colors : [],
    colorIds: Array.isArray(docData.colorIds) ? docData.colorIds : [],
    sizes: Array.isArray(docData.sizes) ? docData.sizes : ['S', 'M', 'L', 'XL'],
    sizeIds: Array.isArray(docData.sizeIds) ? docData.sizeIds : [],
    cat: docData.categorySlug || docData.cat || 'all',
    audienceId: docData.audienceId,
    audienceSlug: docData.audienceSlug,
    isBestseller: Boolean(docData.featured || docData.bestsellerOverride),
    featured: Boolean(docData.featured),
    rating: String(Number(docData.aggregateRating || 0)),
    reviews: docData.approvedReviewCount ? String(docData.approvedReviewCount) : '0',
    sold: docData.soldUnits ? `${docData.soldUnits} sold` : undefined,
    description: docData.description || '',
    collections: Array.isArray(docData.collections) ? docData.collections : [],
    collectionIds: Array.isArray(docData.collectionIds) ? docData.collectionIds : [],
    imageIds: Array.isArray(docData.imageIds) ? docData.imageIds : [],
    sizeGuideId: docData.sizeGuideId || null,
    totalStock: Number(docData.totalStock || 0),
    slug,
    categoryId: docData.categoryId,
    categorySlug: docData.categorySlug,
    createdAt: docData.createdAt,
    updatedAt: docData.updatedAt,
  } as any;
}

export const getAllActiveProducts = cache(async (): Promise<CatalogProduct[]> => {
  try {
    const [snapshot, imagesSnapshot, variantsSnapshot] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'product-images')),
      getDocs(collection(db, 'product-variants')),
    ]);
    const imagesByProduct = new Map<string, Array<{ id: string; order: number }>>();
    imagesSnapshot.forEach((imageSnap) => {
      const data = imageSnap.data();
      if (!data.productId || typeof data.dataUrl !== 'string') return;
      const images = imagesByProduct.get(String(data.productId)) || [];
      images.push({ id: imageSnap.id, order: Number(data.order || 0) });
      imagesByProduct.set(String(data.productId), images);
    });
    const stockByProduct = new Map<string, number>();
    variantsSnapshot.forEach((variantSnap) => {
      const data = variantSnap.data();
      if (!data.productId || data.active === false) return;
      const productId = String(data.productId);
      const available = Math.max(0, Number(data.availableStock ?? (Number(data.stockOnHand || 0) - Number(data.reservedStock || 0))) || 0);
      stockByProduct.set(productId, (stockByProduct.get(productId) || 0) + available);
    });
    const result: CatalogProduct[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status !== 'draft' && data.status !== 'archived') {
        const imageDocs = (imagesByProduct.get(docSnap.id) || []).sort((a, b) => a.order - b.order);
        const images = imageDocs.map((image) => `/api/homepage-image/product/${encodeURIComponent(image.id)}`);
        result.push(formatProductDoc({
          ...data,
          img: images[0] || data.img,
          images: images.length > 0 ? images : data.images,
          imageIds: imageDocs.map((image) => image.id),
          totalStock: stockByProduct.has(docSnap.id) ? stockByProduct.get(docSnap.id) : data.totalStock,
        }, docSnap.id));
      }
    });

    return result;
  } catch (error) {
    console.error('[getAllActiveProducts] Error:', error);
    return [];
  }
});

export const getProductById = cache(async (id: string | number): Promise<CatalogProduct | null> => {
  try {
    const all = await getAllActiveProducts();
    return all.find((p) => String(p.id) === String(id)) || null;
  } catch (error) {
    console.error('[getProductById] Error:', error);
    return null;
  }
});

export const getProductBySlug = cache(async (slug: string): Promise<CatalogProduct | null> => {
  try {
    const normalizedSlug = decodeURIComponent(slug).toLowerCase().trim();
    const all = await getAllActiveProducts();
    return all.find((p) => (p as any).slug === normalizedSlug || String(p.id) === normalizedSlug) || null;
  } catch (error) {
    console.error('[getProductBySlug] Error:', error);
    return null;
  }
});

export const getColorsByIds = cache(async (colorIds: string[]): Promise<ColorDocument[]> => {
  if (!Array.isArray(colorIds) || colorIds.length === 0) return [];
  try {
    const colRef = collection(db, 'colors');
    const snap = await getDocs(colRef);
    const result: ColorDocument[] = [];
    const idSet = new Set(colorIds);

    snap.forEach((docSnap) => {
      const data = docSnap.data() as Omit<ColorDocument, 'id'> & { id?: string };
      if (idSet.has(docSnap.id)) {
        result.push({ ...data, id: docSnap.id } as ColorDocument);
      }
    });

    return result.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('[getColorsByIds] Error:', error);
    return [];
  }
});

export const getProductPolicySummary = cache(async (): Promise<{
  shipping: ShippingPolicySettings;
  returns: ReturnsPolicySettings;
}> => {
  let shipping = defaultShippingSettings;
  let returns = defaultReturnsSettings;

  try {
    const [shipSnap, retSnap] = await Promise.all([
      getDoc(doc(db, 'shipping-policy', 'settings')),
      getDoc(doc(db, 'returns-policy', 'settings')),
    ]);

    if (shipSnap.exists()) {
      shipping = { ...defaultShippingSettings, ...shipSnap.data() };
    }
    if (retSnap.exists()) {
      returns = { ...defaultReturnsSettings, ...retSnap.data() };
    }
  } catch (error) {
    console.warn('[getProductPolicySummary] Fallback to default settings:', error);
  }

  return { shipping, returns };
});

export const getActivePromoCampaigns = cache(async (): Promise<any[]> => {
  try {
    const nowMs = Date.now();
    const snap = await getDocs(collection(db, 'promo-campaigns'));
    const activeCampaigns: any[] = [];

    for (const d of snap.docs) {
      const data = d.data();
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
        timezone: data.timezone || 'Asia/Karachi',
        hideAfterExpiry: data.hideAfterExpiry !== false,
        backgroundOverlayOpacity: Number(data.backgroundOverlayOpacity ?? 0.55),
        textAlignment: data.textAlignment || 'left',
        order: Number(data.order || 0),
      });
    }

    if (activeCampaigns.length === 0) {
      activeCampaigns.push({
        id: 'mid-season-sale',
        badgeText: 'LIMITED TIME ONLY',
        heading: 'Mid Season Sale',
        description: 'this is summer sale',
        highlightText: 'FLAT 30% SALE',
        ctaText: 'SHOP THE SALE',
        discountMode: 'automatic',
        discountType: 'percentage',
        discountValue: 30,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        targetType: 'all-products',
      });
    }

    return activeCampaigns;
  } catch (error) {
    console.error('[getActivePromoCampaigns] Error:', error);
    return [
      {
        id: 'mid-season-sale',
        badgeText: 'LIMITED TIME ONLY',
        heading: 'Mid Season Sale',
        description: 'this is summer sale',
        highlightText: 'FLAT 30% SALE',
        ctaText: 'SHOP THE SALE',
        discountMode: 'automatic',
        discountType: 'percentage',
        discountValue: 30,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        targetType: 'all-products',
      },
    ];
  }
});
