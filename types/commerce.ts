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
  userId: string | null;
  orderId: string | null;
  customerName: string;
  customerEmail: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  verifiedPurchase: boolean;
  adminNote?: string;
  createdAt: string;
  moderatedAt?: string | null;
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
