export type WishlistId = number | string;

type WishlistProduct = { id: WishlistId; slug?: string };

// Older homepage builds converted string product IDs to this numeric hash.
// Recognize it so existing customers keep their saved products after migration.
export function legacyWishlistId(value: WishlistId): number {
  if (typeof value === 'number') return value;
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed)) return parsed;

  return Array.from(value).reduce(
    (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
    0
  );
}

export function wishlistIdMatchesProduct(savedId: WishlistId, product: WishlistProduct): boolean {
  const normalizedSavedId = String(savedId);
  return (
    normalizedSavedId === String(product.id) ||
    Boolean(product.slug && normalizedSavedId === product.slug) ||
    normalizedSavedId === String(legacyWishlistId(product.id)) ||
    Boolean(product.slug && normalizedSavedId === String(legacyWishlistId(product.slug)))
  );
}

export function productIsWishlisted(wishlist: WishlistId[], product: WishlistProduct): boolean {
  return wishlist.some((savedId) => wishlistIdMatchesProduct(savedId, product));
}
