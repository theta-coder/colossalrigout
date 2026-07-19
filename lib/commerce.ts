export type CommerceResource = 'colors' | 'sizes' | 'size-guides' | 'collections' | 'reviews' | 'inventory';

export interface ColorRecord { id: string; name: string; slug: string; hex: string; secondaryHex?: string; active: boolean; order: number; }
export interface SizeRecord { id: string; name: string; code: string; type: string; active: boolean; order: number; }
export interface CollectionRecord { id: string; name: string; slug: string; subtitle: string; description: string; imageData?: string; active: boolean; featuredOnHome: boolean; order: number; }
export interface SizeGuideRecord { id: string; name: string; unit: 'in' | 'cm'; instructions: string; columns: Array<{ key: string; label: string }>; rows: Array<{ sizeId: string; values: Record<string, string> }>; active: boolean; }
export interface ProductVariant { id: string; productId: string; colorId: string; sizeId: string; sku: string; stockOnHand: number; reservedStock: number; availableStock: number; reorderLevel: number; active: boolean; }
