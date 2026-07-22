/**
 * lib/server/product-galleries.ts
 * 
 * Server helper for loading and organizing per-color product image galleries.
 */

import { cache } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProductImageDocument } from '@/types/commerce';

export interface ProductColorGalleryItem {
  id: string;
  url: string;
  dataUrl?: string;
  altText: string;
  role: 'primary' | 'gallery';
  order: number;
}

export interface ProductColorGalleryMap {
  galleriesByColorId: Record<string, ProductColorGalleryItem[]>;
  defaultGallery: ProductColorGalleryItem[];
}

export const getProductColorGalleries = cache(
  async (productId: string): Promise<ProductColorGalleryMap> => {
    try {
      const colRef = collection(db, 'product-images');
      const snap = await getDocs(colRef);
      const galleriesByColorId: Record<string, ProductColorGalleryItem[]> = {};
      const defaultGallery: ProductColorGalleryItem[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data() as ProductImageDocument;
        if (String(data.productId) === String(productId)) {
          const item: ProductColorGalleryItem = {
            id: docSnap.id,
            url: `/api/homepage-image/product/${encodeURIComponent(docSnap.id)}`,
            altText: data.altText || 'Product image',
            role: data.role || 'gallery',
            order: Number(data.order) || 0,
          };

          if (data.colorId) {
            if (!galleriesByColorId[data.colorId]) {
              galleriesByColorId[data.colorId] = [];
            }
            galleriesByColorId[data.colorId].push(item);
          } else {
            defaultGallery.push(item);
          }
        }
      });

      // Sort each color gallery by order, placing 'primary' first
      Object.keys(galleriesByColorId).forEach((cId) => {
        galleriesByColorId[cId].sort((a, b) => {
          if (a.role === 'primary' && b.role !== 'primary') return -1;
          if (b.role === 'primary' && a.role !== 'primary') return 1;
          return a.order - b.order;
        });
      });

      defaultGallery.sort((a, b) => {
        if (a.role === 'primary' && b.role !== 'primary') return -1;
        if (b.role === 'primary' && a.role !== 'primary') return 1;
        return a.order - b.order;
      });

      return { galleriesByColorId, defaultGallery };
    } catch (error) {
      console.error('[getProductColorGalleries] Error:', error);
      return { galleriesByColorId: {}, defaultGallery: [] };
    }
  }
);
