/**
 * lib/server/product-recommendations.ts
 * 
 * Weighted recommendations engine for related products based on category,
 * collections, audience, stock, price range, and merchandising attributes.
 */

import { cache } from 'react';
import { Product as CatalogProduct } from '@/lib/products';
import { getAllActiveProducts } from './products';
import { getEffectiveProductPrice } from '@/lib/shop-filters';

export const getRelatedProducts = cache(
  async (currentProduct: CatalogProduct, limit: number = 4): Promise<CatalogProduct[]> => {
    if (!currentProduct) return [];

    const allProducts = await getAllActiveProducts();
    const currentPrice = getEffectiveProductPrice(currentProduct);
    const currentCat = (currentProduct.cat || '').toLowerCase().trim();
    const currentAudience = (currentProduct.audienceSlug || currentProduct.audienceId || '').toLowerCase().trim();
    const currentCollections = new Set(
      [...(currentProduct.collectionIds || []), ...(currentProduct.collections || [])]
        .map((c) => String(c).toLowerCase().trim())
    );

    const candidates = allProducts.filter(
      (p) => String(p.id) !== String(currentProduct.id)
    );

    const scored = candidates.map((p) => {
      let score = 0;

      // 1. Same category (+50)
      const pCat = (p.cat || '').toLowerCase().trim();
      if (pCat && pCat === currentCat) {
        score += 50;
      }

      // 2. Shared collections (+30 per shared collection, max +60)
      let sharedColls = 0;
      const candidateCollections = [...(p.collectionIds || []), ...(p.collections || [])];
      if (candidateCollections.length > 0) {
        candidateCollections.forEach((col) => {
          if (currentCollections.has(String(col).toLowerCase().trim())) {
            sharedColls++;
          }
        });
      }
      score += Math.min(sharedColls * 30, 60);

      // 3. Same audience (+25)
      const pAudience = (p.audienceSlug || p.audienceId || '').toLowerCase().trim();
      if (pAudience && pAudience === currentAudience) {
        score += 25;
      }

      // 4. Merchandising signals
      if (p.isBestseller) score += 10;
      if (p.featured) score += 8;

      // 5. In stock bonus (+8)
      const hasStock = (p.totalStock ?? 1) > 0;
      if (hasStock) score += 8;

      // 6. Similar price band ±30% (+5)
      const pPrice = getEffectiveProductPrice(p);
      if (currentPrice > 0 && pPrice > 0) {
        const ratio = pPrice / currentPrice;
        if (ratio >= 0.7 && ratio <= 1.3) {
          score += 5;
        }
      }

      // 7. Recent products receive a small freshness bonus.
      const createdAt = p.createdAt ? new Date(p.createdAt).getTime() : 0;
      if (createdAt > 0 && Date.now() - createdAt <= 90 * 24 * 60 * 60 * 1000) score += 3;

      return { product: p, score, hasStock };
    });

    // Deterministic sorting: Score -> Stock -> Bestseller -> ID tie-breaker
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.hasStock !== a.hasStock) return b.hasStock ? 1 : -1;
      if (b.product.isBestseller !== a.product.isBestseller) return b.product.isBestseller ? 1 : -1;
      return String(a.product.id).localeCompare(String(b.product.id), undefined, { numeric: true });
    });

    return scored.slice(0, limit).map((s) => s.product);
  }
);
