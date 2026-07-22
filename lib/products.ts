export interface Product {
  id: number;
  name: string;
  price: number;
  retailPrice?: number;
  discountPrice?: number | null;
  img: string;
  images: string[];
  colors: string[];
  sizes: string[];
  cat: string;
  audienceId?: string;
  audienceSlug?: string;
  isBestseller?: boolean;
  rating?: string;
  reviews?: string;
  sold?: string;
  description: string;
  collections?: string[];
  imageIds?: string[];
  colorIds?: string[];
  sizeIds?: string[];
  collectionIds?: string[];
  sizeGuideId?: string | null;
  totalStock?: number;
  slug?: string;
  categoryId?: string;
  categorySlug?: string;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
  colorGalleries?: Record<string, Array<{
    id: string;
    colorId: string;
    dataUrl?: string;
    url?: string;
    altText: string;
    role: 'primary' | 'gallery';
    order: number;
  }>>;
}

// Static product seed data was intentionally removed. Firestore is the only source.
export const catalog: Product[] = [];
