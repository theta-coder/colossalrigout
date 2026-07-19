export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  imagePath: string; // Storage path, e.g. categories/tops.webp
  imageUrl: string;  // Download URL or fallback external URL
  order: number;
  active: boolean;
  style: 'image' | 'sale';
  createdAt?: string;
  updatedAt?: string;
}
