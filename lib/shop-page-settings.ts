/**
 * lib/shop-page-settings.ts
 * 
 * Shared TypeScript interfaces, default settings, normalization,
 * and validation helpers for the Shop Page Banner module.
 */

export interface ShopBannerSettings {
  id: 'banner';
  enabled: boolean;
  imagePath: string;
  imageUrl?: string;
  imageAlt: string;
  overlayOpacity: number;
  imagePosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SHOP_BANNER_SETTINGS: ShopBannerSettings = {
  id: 'banner',
  enabled: true,
  imagePath: 'shop-page-images/banner',
  imageUrl: '/api/shop-banner-image',
  imageAlt: 'Colossal Rigout shop collection',
  overlayOpacity: 0.6,
  imagePosition: 'center',
};

export function normalizeShopBannerSettings(data: any): ShopBannerSettings {
  if (!data || typeof data !== 'object') return { ...DEFAULT_SHOP_BANNER_SETTINGS };

  const validPositions = ['center', 'top', 'bottom', 'left', 'right'];
  const imagePosition = validPositions.includes(data.imagePosition)
    ? data.imagePosition
    : DEFAULT_SHOP_BANNER_SETTINGS.imagePosition;

  const rawOpacity = Number(data.overlayOpacity);
  const overlayOpacity = Number.isFinite(rawOpacity)
    ? Math.min(Math.max(rawOpacity, 0.2), 0.85)
    : DEFAULT_SHOP_BANNER_SETTINGS.overlayOpacity;

  return {
    id: 'banner',
    enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULT_SHOP_BANNER_SETTINGS.enabled,
    imagePath: typeof data.imagePath === 'string' ? data.imagePath.trim() : DEFAULT_SHOP_BANNER_SETTINGS.imagePath,
    imageUrl: typeof data.imageUrl === 'string' && data.imageUrl.trim() ? data.imageUrl.trim() : '/api/shop-banner-image',
    imageAlt: typeof data.imageAlt === 'string' ? data.imageAlt.trim().slice(0, 160) : DEFAULT_SHOP_BANNER_SETTINGS.imageAlt,
    overlayOpacity,
    imagePosition,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export function validateShopBannerInput(data: any): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (data.imageAlt && typeof data.imageAlt === 'string' && data.imageAlt.trim().length > 160) {
    errors.imageAlt = 'Image alt text must be at most 160 characters.';
  }

  if (data.overlayOpacity !== undefined) {
    const op = Number(data.overlayOpacity);
    if (isNaN(op) || op < 0.2 || op > 0.85) {
      errors.overlayOpacity = 'Overlay opacity must be between 0.2 and 0.85.';
    }
  }

  if (data.imagePosition && !['center', 'top', 'bottom', 'left', 'right'].includes(data.imagePosition)) {
    errors.imagePosition = 'Invalid image position alignment.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
