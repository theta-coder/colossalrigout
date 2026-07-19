export interface ProductDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categorySlug: string;
  retailPrice: number;
  discountPrice: number | null;
  currency: 'USD' | 'PKR';
  imageIds: string[];
  primaryImageId: string | null;
  colorIds: string[];
  sizeIds: string[];
  collectionIds: string[];
  sizeGuideId: string | null;
  status: 'draft' | 'active' | 'archived';
  featured: boolean;
  bestsellerOverride: boolean;
  aggregateRating: number;
  approvedReviewCount: number;
  soldUnits: number;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImageDocument {
  id: string;
  productId?: string;
  storagePath: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  role: 'primary' | 'gallery';
  order: number;
  createdAt: string;
}

export interface ColorDocument {
  id: string;
  name: string;
  slug: string;
  hex: string;
  secondaryHex?: string | null;
  swatchType: 'solid' | 'dual';
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SizeDocument {
  id: string;
  name: string;
  code: string;
  type: 'clothing' | 'shoe' | 'kids' | 'accessory' | 'custom';
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SizeGuideColumn {
  key: string;
  label: string;
  order: number;
}

export interface SizeGuideRow {
  sizeId: string;
  sizeName: string;
  values: Record<string, string>;
  order: number;
}

export interface SizeGuideDocument {
  id: string;
  name: string;
  categoryIds: string[];
  unit: 'in' | 'cm';
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
  instructions: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantDocument {
  id: string; // productId_colorId_sizeId
  productId: string;
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;
  sku: string;
  barcode?: string | null;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDocument {
  id: string;
  name: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  imageId: string | null;
  imageUrl?: string | null;
  active: boolean;
  featuredOnHome: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewDocument {
  id: string;
  productId: string;
  productNameSnapshot?: string;
  productSlugSnapshot?: string;
  userId: string | null;
  orderId: string | null;
  customerName: string;
  customerEmail: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  verifiedPurchase: boolean;
  source?: 'customer' | 'admin-seed';
  adminNote?: string;
  moderatedBy?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryTransactionDocument {
  id: string;
  productId: string;
  variantId: string;
  type: 'opening' | 'purchase' | 'sale' | 'return' | 'adjustment' | 'reservation' | 'release';
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  orderId?: string | null;
  reason?: string;
  actorId: string;
  createdAt: string;
}

export interface PromoCampaignDocument {
  id: string;
  internalName: string;
  badgeText: string;
  heading: string;
  description: string;
  highlightText: string;
  ctaText: string;
  discountMode: 'automatic' | 'coupon';
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  couponCode: string;
  minimumOrder: number;
  targetType: 'all-products' | 'selected-products' | 'selected-categories';
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  timezone: string;
  hideAfterExpiry: boolean;
  status: 'draft' | 'active' | 'inactive';
  backgroundImageId: string;
  backgroundOverlayOpacity: number;
  textAlignment: 'left' | 'center';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCampaignImageDocument {
  id: string;
  campaignId: string;
  dataUrl: string;
  mimeType: 'image/webp';
  role: 'background';
  createdAt: string;
  updatedAt: string;
}

export interface CampaignCardDocument {
  id: string;
  internalName: string;
  cardType: 'discount' | 'announcement' | 'store' | 'new-arrival' | 'event';
  eyebrowText: string;
  heading: string;
  description: string;
  buttonText: string;
  imageId: string;
  overlayOpacity: number;
  textPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  actionType: 'campaign-products' | 'collection' | 'product' | 'store-location' | 'custom-page';
  productId?: string;
  collectionId?: string;
  storeId?: string;
  internalPath?: string;
  hasDiscount: boolean;
  promotionId?: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: 'draft' | 'active' | 'inactive';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignCardImageDocument {
  id: string;
  cardId: string;
  dataUrl: string;
  mimeType: 'image/webp';
  role: 'card-background';
  createdAt: string;
  updatedAt: string;
}

export interface PromotionDocument {
  id: string;
  name: string;
  publicMessage: string;
  discountType: 'percentage' | 'fixed' | 'free-shipping';
  discountValue: number;
  maximumDiscount?: number;
  minimumOrder: number;
  applicationMode: 'automatic' | 'coupon';
  couponCode?: string;
  stackable: boolean;
  targetType: 'all-products' | 'selected-products' | 'selected-categories' | 'selected-collections';
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
  loginRequired: boolean;
  maxUsesPerUser: number;
  globalUsageLimit?: number;
  usedCount: number;
  channel: 'online' | 'in-store' | 'both';
  storeIds: string[];
  startsAt: string;
  endsAt: string;
  status: 'draft' | 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PromotionRedemptionDocument {
  id: string;
  promotionId: string;
  userId: string;
  orderId?: string;
  storeId?: string;
  channel: 'online' | 'in-store';
  discountAmount: number;
  redeemedAt: string;
}

export interface StoreDocument {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  mapUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
