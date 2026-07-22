/**
 * lib/shop-filters.ts
 * 
 * Utility functions for shop page filtering:
 * - Effective product price calculation
 * - Dynamic price bounds (min/max)
 * - Dynamic price slider step calculation
 * - Color matching (ID-based with legacy name fallback)
 * - Size matching (Support string arrays, size objects, sizeIds, and synonyms)
 */

import { ColorDocument } from '../types/commerce';

export function getEffectiveProductPrice(product: any): number {
  if (!product || typeof product !== 'object') return 0;

  // Active campaign price has first priority
  if (product.campaignDiscountApplied && Number.isFinite(Number(product.price)) && Number(product.price) > 0) {
    return Number(product.price);
  }

  // Valid manual discount price has second priority
  const discountPrice = Number(product.discountPrice);
  const retailPrice = Number(product.retailPrice ?? product.price);

  if (
    Number.isFinite(discountPrice) &&
    discountPrice > 0 &&
    Number.isFinite(retailPrice) &&
    discountPrice < retailPrice
  ) {
    return discountPrice;
  }

  const price = Number(product.price ?? retailPrice);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function getProductPriceBounds(products: any[]): { min: number; max: number } {
  if (!Array.isArray(products) || products.length === 0) {
    return { min: 0, max: 0 };
  }

  const prices = products
    .map(getEffectiveProductPrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.floor(Math.min(...prices)),
    max: Math.ceil(Math.max(...prices)),
  };
}

export function getDynamicPriceStep(min: number, max: number): number {
  const spread = max - min;
  if (spread <= 1000) return 50;
  if (spread <= 5000) return 100;
  if (spread <= 20000) return 250;
  return 500;
}

export function productMatchesColor(
  product: any,
  selectedColorId: string | null,
  availableColors: ColorDocument[]
): boolean {
  if (!selectedColorId) return true;

  // Primary match: product.colorIds array
  if (Array.isArray(product.colorIds) && product.colorIds.length > 0) {
    if (product.colorIds.some((id: any) => String(id) === String(selectedColorId))) {
      return true;
    }
  }

  // Legacy fallback: match by color name
  const selectedColor = availableColors.find((c) => String(c.id) === String(selectedColorId));
  if (selectedColor) {
    const normSelectedName = selectedColor.name.trim().toLowerCase();
    if (Array.isArray(product.colors) && product.colors.length > 0) {
      return product.colors.some((cName: any) => {
        const strVal = (typeof cName === 'string' ? cName : cName?.name || cName?.id || '').trim().toLowerCase();
        return strVal === normSelectedName || strVal.includes(normSelectedName) || normSelectedName.includes(strVal);
      });
    }
  }

  return false;
}

export function productMatchesSize(product: any, selectedSize: string | null): boolean {
  if (!selectedSize) return true;
  const normSelected = selectedSize.trim().toLowerCase();

  // 1. Direct match in product.sizes
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    const matched = product.sizes.some((s: any) => {
      if (typeof s === 'string') return s.trim().toLowerCase() === normSelected;
      if (s && typeof s === 'object') {
        const val = String(s.name || s.label || s.id || s.value || '').trim().toLowerCase();
        return val === normSelected;
      }
      return false;
    });
    if (matched) return true;
  }

  // 2. Direct match in product.sizeIds
  if (Array.isArray(product.sizeIds) && product.sizeIds.length > 0) {
    const matched = product.sizeIds.some((s: any) => String(s).trim().toLowerCase() === normSelected);
    if (matched) return true;
  }

  // 3. Synonym matching (e.g. S -> Small, M -> Medium, L -> Large, XL -> Extra Large)
  const sizeMap: Record<string, string[]> = {
    's': ['small', 's'],
    'm': ['medium', 'm'],
    'l': ['large', 'l'],
    'xl': ['extra large', 'xl', 'x-large'],
    '2xl': ['xxl', '2xl', 'double extra large'],
    '3xl': ['3xl', 'triple extra large'],
    'xs': ['extra small', 'xs'],
  };

  const synonyms = sizeMap[normSelected] || [normSelected];

  if (Array.isArray(product.sizes)) {
    return product.sizes.some((s: any) => {
      const strVal = (typeof s === 'string' ? s : s?.name || s?.id || '').trim().toLowerCase();
      return synonyms.includes(strVal);
    });
  }

  return false;
}
