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
}

// Static product seed data was intentionally removed. Firestore is the only source.
export const catalog: Product[] = [];
