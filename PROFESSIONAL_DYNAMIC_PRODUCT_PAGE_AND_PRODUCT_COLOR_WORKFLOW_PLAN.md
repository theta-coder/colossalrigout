# Professional Dynamic Product Page and Product–Color Workflow Plan

## 1. Purpose

This document defines the complete implementation plan for making the Product administration workflow and public Product page professionally dynamic.

The implementation will cover:

1. Pakistani Rupee (`PKR`) currency across product management and customer-facing commerce.
2. Colors loaded exclusively from the existing Admin **Colors** module.
3. Color selection during Add Product and Edit Product.
4. The same saved product colors displayed on the frontend Product page, Shop page, cards, and Quick Add.
5. Dynamic Shipping & Returns content on the Product page.
6. A verified and hardened dynamic review system.
7. Product-specific SEO metadata and social previews.
8. Smarter `You May Also Like` recommendations based on category, collection, and audience.

This is an implementation plan only. No feature code is implemented by this document.

---

## 2. Current-State Audit

### Already dynamic

The following Product-page data is already loaded from product/API records:

- Product name
- Product category
- Product description
- Product images/gallery
- Retail and discount prices
- Promotion/campaign application
- Selected product sizes
- Product-specific size guide
- Variant inventory and available stock
- Quantity selection
- Wishlist and Add to Cart behavior
- Reviews fetched by product ID
- Review submission with pending moderation
- Approved review display and rating summary
- Product stock and variant matching

### Still incomplete or inconsistent

- Customer prices are displayed using `$` instead of PKR.
- Add Product labels still mention USD.
- Product records allow both `USD` and `PKR`, causing inconsistent store data.
- The Product page uses a hardcoded name-to-Tailwind color map.
- Add/Edit Product must be guaranteed to use Colors-module IDs as the single source of truth.
- Product colors must remain linked to inventory variants by ID.
- Shipping & Returns text on the Product page is hardcoded and contains mixed `$` and `Rs.` values.
- Reviews are dynamic, but moderation-driven aggregates and cache invalidation need verification/hardening.
- The Product page uses `/product?id=...`, which is unsuitable for professional product SEO.
- Related products use a basic category-first fallback rather than a scored recommendation strategy.

---

## 3. Scope

### Included

- Fixed Pakistani store currency.
- Shared PKR formatter.
- Product API currency defaults and validation.
- Add/Edit Product PKR labels.
- Colors API integration in Add/Edit Product.
- Product `colorIds` persistence.
- Dynamic HEX/dual-color circles with no HEX text on storefront.
- Variant color-ID consistency.
- Dynamic Shipping & Returns product accordion.
- Review flow audit, aggregation, moderation consistency, and cache invalidation.
- SEO-friendly product route.
- Dynamic metadata, canonical URL, Open Graph, Twitter card, and Product JSON-LD.
- Weighted related-product recommendations.
- Backward compatibility and migration strategy.

### Not included

- Multi-currency selector.
- Live currency exchange rates.
- Automatic conversion of old USD-like demo prices.
- Review rewards or loyalty points.
- AI-generated recommendations.
- Personalized recommendations based on customer browsing history.
- New Shipping or Returns Admin modules; the existing modules will be reused and extended only where structured fields are missing.

---

## 4. Currency Architecture — PKR Only

### Store rule

The store currency must be fixed as:

```ts
currency: 'PKR'
locale: 'en-PK'
```

### Shared formatter

Add to:

```text
lib/utils.ts
```

Recommended helper:

```ts
export function formatPkr(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeValue);
}
```

Expected output:

```text
PKR 1,000
PKR 2,499
PKR 10,000
```

### Product Admin changes

Change labels:

```text
RETAIL PRICE ($ USD)     → RETAIL PRICE (PKR)
DISCOUNT PRICE ($ USD)   → DISCOUNT PRICE (PKR)
```

Placeholders should use Pakistani amounts:

```text
e.g. 2500
Optional; must be lower than retail price
```

### Product API requirements

Update product create/update normalization so every newly saved product has:

```ts
currency: 'PKR'
```

Recommended server rules:

- Ignore a browser-supplied unsupported currency.
- Set `PKR` server-side.
- Retail price must be finite and greater than zero.
- Discount price must be finite, greater than zero, and lower than retail price.
- Store numeric PKR amounts without symbols or commas.
- Format only at display time.

### Existing data

Do not automatically multiply existing prices by an exchange rate.

Important distinction:

- Changing `$27.00` to `PKR 27` changes only presentation.
- If the intended local price is PKR 2,700, Admin must update the stored amount to `2700`.
- A one-time bulk price migration requires a separate explicit user decision.

### Required customer-facing coverage

Use the same formatter in:

- Product page current price
- Product page retail/struck-through price
- Campaign-discount price
- Related product cards
- Shop product cards
- Quick Add modal
- Cart
- Wishlist
- Checkout
- Order History
- Order tracking details where prices appear
- Admin product list
- Admin order totals

This avoids a Product page showing PKR while Cart or Checkout still shows dollars.

---

## 5. Colors Module as the Single Source of Truth

### Business rule

The Admin **Colors** module is the authoritative source for all selectable product colors.

The flow must be:

```text
Admin Colors Module
        |
        v
Firestore colors collection
        |
        v
Add/Edit Product color selector
        |
        v
Product colorIds[]
        |
        +------> Inventory variants (colorId)
        |
        +------> Product page swatches
        |
        +------> Shop filters/cards
        |
        +------> Quick Add
```

No separate hardcoded color list should remain in Product Admin or storefront code.

### Existing color model

Reuse:

```ts
interface ColorDocument {
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
```

### Remove hardcoded color sources

Remove or stop using:

```ts
const defaultColors = ['Black', 'Stone', 'Navy', ...];
```

```ts
const colorClasses = {
  Black: 'bg-black',
  Stone: 'bg-stone-300',
  ...
};
```

Defaults may remain only inside the Colors API seed logic, not in Add Product or frontend rendering.

---

## 6. Add Product and Edit Product Color Integration

### Fetching colors

The Admin Product form must load colors from the existing protected/public commerce endpoint:

```http
GET /api/commerce/colors
```

or the existing equivalent:

```http
GET /api/colors
```

Prefer one canonical endpoint across Admin and storefront. Avoid two endpoints returning different shapes.

### Loading behavior

- Load active colors when Admin Product form initializes.
- Sort by `order`, then name.
- Show a loading skeleton while fetching.
- Show Retry on failure.
- Never silently replace an API failure with hardcoded colors.
- Disable product submission if selected colors cannot be validated.

### Admin color selector UI

Each option should display:

- Visual color circle
- Color name
- Selected/unselected state
- Optional inactive warning when editing a legacy product

Do not show raw HEX as the primary customer/admin label. HEX may be visible only as secondary technical information inside the Colors management module.

Solid color:

```ts
style={{ backgroundColor: color.hex }}
```

Dual color:

```ts
style={{
  background: `linear-gradient(135deg, ${color.hex} 50%, ${color.secondaryHex} 50%)`
}}
```

### Form state

Use IDs:

```ts
const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
```

Do not store color names as form identity.

### Product save payload

```ts
{
  product: {
    ...,
    colorIds: ['col-black', 'col-stone'],
    ...
  }
}
```

The API should optionally produce a backward-compatible `colors` name snapshot, but `colorIds` remains authoritative:

```ts
colors: ['Black', 'Stone']
```

This snapshot is for old UI compatibility only and must not be used as the primary relationship.

### Server validation

When creating/updating a product:

1. Require `colorIds` to be an array.
2. Deduplicate IDs.
3. Load referenced Colors documents.
4. Reject unknown IDs.
5. Reject inactive IDs for new products.
6. Allow an existing inactive color to remain temporarily during editing, but show a warning and prevent newly adding it.
7. Save IDs only after validation.

### Edit Product behavior

- Preselect the product’s saved `colorIds`.
- Resolve and display current names and circles.
- Preserve selection unless Admin changes it.
- Warn before removing a color that has inventory variants or stock.
- Removing a color must not silently orphan inventory.

### No-colors state

Some products may legitimately have no color choice.

Recommended model addition:

```ts
hasColorVariants: boolean
```

Behavior:

- If enabled, at least one active color is required.
- If disabled, `colorIds` may be empty and the frontend hides the color selector.
- Do not invent a fake `Default` color unless inventory architecture requires a default variant; if required, use an explicit system color/variant ID documented separately.

---

## 7. Product Colors and Inventory Variants

### Variant identity

Keep the existing stable variant relationship:

```ts
variant.colorId
variant.sizeId
```

Recommended variant ID:

```text
productId_colorId_sizeId
```

### Product update impact

When colors or sizes change:

- Calculate added combinations.
- Calculate removed combinations.
- Create missing inventory variants with zero/opening stock.
- Never delete a variant with stock, reservations, or transaction history without explicit confirmation.
- Prefer archiving removed variants by setting `active: false`.
- Preserve transaction history.

### Stock display

On the Product page:

- Color and size selection resolves the exact variant.
- Stock message reflects that selected variant only.
- Add to Cart remains disabled when the exact variant is unavailable.
- Changing color must re-evaluate valid sizes and stock.

---

## 8. Reusable Color Swatch Component

Create:

```text
components/ui/ColorSwatch.tsx
```

Suggested props:

```ts
interface ColorSwatchProps {
  color: ColorDocument;
  selected?: boolean;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
}
```

Requirements:

- Render solid HEX.
- Render dual-color gradient.
- Add neutral border so white/light colors remain visible.
- Show selected ring.
- Show disabled/out-of-stock state.
- Use color name in `title` and `aria-label`.
- Do not show HEX on customer-facing pages.

Reuse in:

- Add Product
- Edit Product
- Product page
- Shop color filter
- Shop product cards
- Quick Add modal
- Wishlist cards, if colors are shown

---

## 9. Frontend Product Page Color Rendering

### Product data requirements

The Product API/client product object must provide:

```ts
colorIds: string[]
```

The Product page must resolve only those IDs against Colors-module records.

### Required behavior

If Admin selects:

```text
Black, Navy, Stone
```

the Product page must show exactly:

```text
Black, Navy, Stone
```

It must not show every color from the Colors module.

### Resolution

```ts
const productColors = product.colorIds
  .map(id => colorsById.get(id))
  .filter(Boolean);
```

### Selection state

Use ID:

```ts
const [selectedColorId, setSelectedColorId] = useState(product.colorIds[0] || '');
```

Display selected name:

```text
Color: Stone
```

Never use name as the internal selection key.

### Legacy compatibility

For old products without `colorIds`:

1. Resolve `product.colors` names against active Colors-module records.
2. Match case-insensitively by name or slug.
3. Render matched colors.
4. Log unmatched legacy color names in Admin diagnostics.
5. Provide an optional migration route to save resolved IDs permanently.

---

## 10. Dynamic Shipping & Returns on Product Page

### Current problem

This text is hardcoded:

```text
Free shipping on orders over $75. Standard delivery in 4–6 business days
for Rs. 500 flat / $5.00 flat. Easy 30-day returns — item must be unworn
with original tags attached.
```

It contains:

- Incorrect dollar threshold
- Mixed currencies
- Hardcoded delivery timeline
- Hardcoded flat rate
- Hardcoded return window and conditions

### Reuse existing modules

Use:

```http
GET /api/shipping-policy
GET /api/returns-policy
```

Existing Admin modules:

- Shipping Policy
- Returns Policy

### Structured settings extension

Do not parse numbers from free-form policy paragraphs. Extend Shipping Policy settings with structured storefront fields:

```ts
interface ShippingPolicySettings {
  id: 'settings';
  pageTitle: string;
  intro: string;
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  flatRateEnabled: boolean;
  flatRate: number;
  deliveryMinBusinessDays: number;
  deliveryMaxBusinessDays: number;
  productPageEnabled: boolean;
  productPageNote: string;
  updatedAt?: string;
}
```

Extend Returns settings with structured fields:

```ts
interface ReturnsPolicySettings {
  ...
  returnWindowDays: number;
  productPageEnabled: boolean;
  productPageSummary: string;
}
```

### Admin fields

Shipping Policy Admin:

- Free shipping enabled
- Free shipping minimum order (PKR)
- Flat shipping enabled
- Flat shipping rate (PKR)
- Minimum delivery business days
- Maximum delivery business days
- Show on Product page
- Optional additional Product-page note

Returns Policy Admin:

- Return window in days
- Show on Product page
- Short Product-page summary
- Existing full conditions remain managed in their current module

### Product-page text generation

Generate safe text from structured values:

```text
Free shipping on orders over PKR 5,000. Standard delivery in 4–6 business
days. Flat shipping: PKR 500. Easy 30-day returns — item must meet our
return conditions.
```

Use `formatPkr()` for thresholds/rates.

### Accordion design

Recommended structure:

```text
Shipping & Returns
  - Shipping summary
  - Return summary
  - View Shipping Policy
  - View Returns & Exchanges
```

Links remain hardcoded internal routes:

```text
/shipping-policy
/returns
```

### Loading/fallback

- Prefer server-side fetching to avoid accordion text flashing.
- If data fails, show a neutral fallback with policy links.
- Never show obsolete mixed-currency hardcoded text.
- Hidden/inactive Product-page summaries should not render.

### Cache invalidation

Shipping/Returns Admin updates must revalidate:

```ts
revalidatePath('/product/[slug]', 'page')
revalidateTag('product-policy-summary')
revalidateTag('shipping-policy')
revalidateTag('returns-policy')
```

Use version-compatible APIs for the installed Next.js version.

---

## 11. Reviews — Current Dynamic Status and Required Hardening

### Audit result

Reviews are already dynamic.

Current behavior includes:

- Fetch reviews by `productId`
- Public response includes approved reviews only
- Rating average
- Review count
- Rating breakdown
- Review submission
- New reviews saved as `pending`
- Server-side product validation
- Optional verified-purchase validation
- Admin moderation support
- Private email omitted from public response

No second review system should be created.

### Required completion work

#### Aggregate synchronization

When Admin approves, rejects, or deletes a review:

- Recalculate approved review count.
- Recalculate average rating.
- Update product fields:

```ts
aggregateRating
approvedReviewCount
```

- Revalidate Product page and homepage review sections.

#### Product page source of truth

- Live Reviews accordion should use the Reviews API summary.
- Header rating may use cached product aggregates for immediate rendering.
- Ensure cached aggregate and API summary cannot drift permanently.
- Moderation mutation should update both in one server workflow/batch where possible.

#### Submission UX

- Validate required name, email, rating, title, and body.
- Show pending-moderation success message.
- Prevent double submission while request is running.
- Preserve form input on API failure.
- Add accessible validation messages.

#### Abuse prevention

- Add reasonable request-size limit.
- Add duplicate-submission prevention by user/email/product/time window.
- Add rate limiting when production infrastructure supports it.
- Sanitize plain text and never render review HTML.
- Keep Admin moderation mandatory.

#### Pagination

- Avoid loading unlimited approved reviews.
- Add cursor or limit pagination.
- Keep `Load more reviews` based on the API.

#### Verified purchase

- Verify order ownership and product inclusion server-side.
- Never trust `verifiedPurchase` from the client.
- Continue displaying Verified Buyer only for server-verified records.

---

## 12. Professional Product Routing for SEO

### Current limitation

Current URL:

```text
/product?id=123
```

This makes product-specific metadata difficult because the current Product page is a client component.

### Recommended route

Create:

```text
app/product/[slug]/page.tsx
```

URLs become:

```text
/product/premium-oxford-shirt
```

### Backward compatibility

Keep legacy links working:

```text
/product?id=123
```

Legacy route should:

1. Resolve product by ID.
2. Redirect permanently or temporarily to `/product/<slug>`.
3. Preserve safe campaign/referral parameters if required.

Update all internal product links to use the slug route.

### Server/client split

Recommended structure:

```text
app/product/[slug]/page.tsx              Server Component
components/product/ProductDetails.tsx    Client Component
components/product/ProductReviews.tsx    Client Component where needed
components/product/RelatedProducts.tsx   Server or client as appropriate
```

The server page should load:

- Product
- Color documents for `colorIds`
- Size/size-guide data
- Shipping/Returns summary
- Initial approved review summary
- Related products

Interactive selection/cart logic remains in a focused client component.

---

## 13. Dynamic Product SEO Metadata

### `generateMetadata`

Implement in:

```text
app/product/[slug]/page.tsx
```

Recommended metadata:

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found | Colossal Rigout',
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.name} | Colossal Rigout`;
  const description = createSeoDescription(product.description);
  const imageUrl = getAbsoluteProductImageUrl(product.primaryImageId);

  return {
    title,
    description,
    alternates: {
      canonical: `/product/${product.slug}`,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/product/${product.slug}`,
      siteName: 'Colossal Rigout',
      images: imageUrl ? [{ url: imageUrl, alt: product.name }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}
```

### Description rules

- Strip HTML.
- Collapse whitespace.
- Use approximately 120–160 characters.
- Never expose internal IDs or Admin notes.
- Fall back to category/audience copy when description is missing.

### Social image

The product's primary image must be available through a public HTTP image route.

Do not put a base64 `data:` URL directly in Open Graph metadata.

Use the existing managed image route or a dedicated route:

```text
/api/homepage-image/product/<imageId>
```

The URL must be absolute in final metadata using the configured site origin.

### Canonical domain

Add a single site URL environment value:

```text
NEXT_PUBLIC_SITE_URL=https://colossalrigout.pk
```

Validate it and fall back safely in local development.

### Indexing rules

- Active product: index/follow.
- Draft/archived product: not publicly accessible; noindex.
- Missing product: use `notFound()` and noindex metadata.
- Do not expose Admin draft products through metadata or sitemap.

---

## 14. Product Structured Data (JSON-LD)

Add Schema.org Product structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Premium Oxford Shirt",
  "description": "...",
  "image": ["https://..."],
  "sku": "...",
  "brand": {
    "@type": "Brand",
    "name": "Colossal Rigout"
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "PKR",
    "price": "2500",
    "availability": "https://schema.org/InStock",
    "url": "https://colossalrigout.pk/product/premium-oxford-shirt"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "25"
  }
}
```

Rules:

- Include aggregate rating only when at least one approved review exists.
- Use effective valid product price.
- Set PKR explicitly.
- Use real stock availability.
- Escape JSON safely.
- Do not include customer email or private review fields.

---

## 15. Dynamic Sitemap

Add or update:

```text
app/sitemap.ts
```

Include:

- Active products only
- Canonical slug URL
- Product `updatedAt` as `lastModified`
- Appropriate change frequency/priority

Exclude:

- Draft products
- Archived products
- Legacy query-string URLs
- Products missing valid slugs

---

## 16. Smarter `You May Also Like` Recommendations

### Goal

Recommend the most relevant active products using existing catalog relationships.

### Candidate eligibility

Exclude:

- Current product
- Draft/archived products
- Invalid/missing price products
- Products without a public image only if business wants image-required recommendations
- Completely unavailable products when `hideOutOfStockRecommendations` is enabled

### Weighted score

Recommended score:

| Relationship | Score |
|---|---:|
| Same category ID/slug | +50 |
| Shared collection | +30 per shared collection, capped at +60 |
| Same audience ID/slug | +25 |
| Bestseller | +10 |
| Featured | +8 |
| In stock | +8 |
| Similar price band | +5 |
| Recently added | +3 |

Example:

```ts
score =
  categoryScore +
  collectionScore +
  audienceScore +
  merchandisingScore +
  stockScore +
  priceScore +
  recencyScore;
```

### Similar price band

Compare effective PKR prices:

```text
within ±30% of current product price → +5
```

This avoids recommending an unrelated extreme-price item when stronger candidates exist.

### Deterministic ordering

Sort by:

1. Score descending
2. In-stock status
3. Bestseller/featured status
4. Updated/created date descending
5. Product ID as stable final tie-breaker

Do not use random ordering during SSR; randomness can cause hydration mismatch and unstable SEO output.

### Recommendation count

Return up to four products for the current design.

Fallback sequence:

1. Same category
2. Shared collection
3. Same audience
4. Featured/bestsellers
5. Latest active in-stock products

### Server helper

Create:

```text
lib/server/product-recommendations.ts
```

Suggested function:

```ts
getRelatedProducts(product: ProductDocument, limit = 4): Promise<ProductCardData[]>
```

Cache by product ID/slug and catalog update tags.

### Future optional Admin override

Optionally support later:

```ts
relatedProductIds: string[]
```

Manual Admin-selected recommendations would appear first, followed by algorithmic results. This is optional and not required for the initial implementation.

---

## 17. Product Server Data Layer

Create or extend:

```text
lib/server/products.ts
```

Recommended functions:

```ts
getProductById(id: string)
getProductBySlug(slug: string)
getProductColors(colorIds: string[])
getProductSizeGuide(sizeGuideId: string | null)
getProductPolicySummary()
getProductReviewSummary(productId: string)
getRelatedProducts(product, limit)
```

Requirements:

- Return active public products only for storefront calls.
- Normalize old data.
- Never expose internal Admin-only fields.
- Use request deduplication.
- Add cache tags by product and shared resources.
- Use the project's working Firebase SDK fallback when Firestore REST permissions fail.

Suggested tags:

```text
products
product:<id>
product-slug:<slug>
colors
inventory:<productId>
reviews:<productId>
product-policy-summary
recommendations:<productId>
```

---

## 18. API and Mutation Revalidation

### Product create/update

After saving a product:

```ts
revalidatePath('/shop');
revalidatePath(`/product/${slug}`);
revalidateTag('products');
revalidateTag(`product:${id}`);
revalidateTag(`product-slug:${slug}`);
revalidateTag(`recommendations:${id}`);
```

Also invalidate recommendations of other products sharing the changed category, collection, or audience as required.

### Colors update

After creating/updating a color:

```ts
revalidateTag('colors');
revalidatePath('/shop');
```

Product pages using that color must also update. A shared `colors` tag is preferable to invalidating every page individually.

### Review moderation

After approve/reject/delete:

```ts
revalidateTag(`reviews:${productId}`);
revalidateTag(`product:${productId}`);
revalidatePath(`/product/${productSlug}`);
revalidatePath('/');
```

### Shipping/Returns update

Invalidate the shared Product-policy summary tag so every Product page receives current policy content.

---

## 19. Migration Strategy

### Phase A — Currency label/data normalization

1. Change new product default currency to PKR.
2. Change Admin labels to PKR.
3. Replace frontend formatters.
4. Audit stored product price values.
5. Do not auto-convert values without explicit approval.

### Phase B — Product color IDs

Create optional protected migration route:

```text
app/api/admin/products/migrate-colors/route.ts
```

Migration behavior:

1. Load all Color documents.
2. Build name/slug lookup.
3. For products missing `colorIds`, map legacy names.
4. Report unmatched names.
5. Dry-run by default.
6. Require explicit `apply=true` for writes.
7. Never overwrite valid existing `colorIds`.
8. Produce created/updated/skipped/error counts.

### Phase C — Product route slugs

1. Validate every active product has a unique slug.
2. Generate missing slugs.
3. Resolve duplicates predictably.
4. Add slug route.
5. Update internal links.
6. Add legacy redirect.
7. Add sitemap/canonical metadata.

### Phase D — Policy structured fields

1. Add new fields with safe defaults.
2. Populate values in Admin Shipping/Returns modules.
3. Verify Product accordion output.
4. Remove old hardcoded paragraph only after settings work.

---

## 20. Validation and Security

### Product

- Product name required.
- Unique normalized slug.
- PKR retail price greater than zero.
- Discount lower than retail.
- Color IDs validated against Firestore.
- Size IDs validated.
- Category/audience/collection IDs validated.
- Draft products not publicly accessible.

### Colors

- HEX must normalize to `#RRGGBB`.
- Secondary HEX must be valid when present.
- IDs cannot be supplied arbitrarily for new records.
- Prevent unsafe deletion when referenced by products/variants.
- Prefer deactivate/archive over delete.

### Reviews

- Approved-only public reads.
- Email never returned publicly.
- Verified purchase server-derived.
- Plain text only.
- Body/request length limits.
- Admin authorization for moderation.

### SEO

- Escape all metadata/JSON-LD values.
- Use only public product data.
- Validate absolute image URLs.
- Noindex draft/archived/missing products.
- Avoid duplicate canonical URLs.

### Policy content

- Numeric limits validated server-side.
- Text rendered as plain text.
- Internal policy links validated.
- Admin authorization required for updates.

---

## 21. Failure and Fallback Behavior

### Colors failure

- Product page must not crash.
- Hide the selector if colors cannot be resolved.
- Prevent Add to Cart if the product requires a color variant but no valid variant can be selected.
- Show retry/error state where appropriate.
- Never show inaccurate hardcoded colors.

### Policy failure

- Show neutral fallback:

```text
Shipping and return information is available in our policies.
```

- Show links to Shipping Policy and Returns.
- Do not show obsolete dollar values.

### Review failure

- Product details remain available.
- Show `Reviews temporarily unavailable`.
- Do not display incorrect cached counts as live review content.

### Recommendation failure

- Hide `You May Also Like` or show safe latest-product fallback.
- Product page remains fully usable.

### SEO data failure

- Missing product uses `notFound()`.
- Missing image omits social image or uses the brand fallback.
- Metadata generation must not crash the entire request.

---

## 22. Recommended File Changes

### New files

```text
app/product/[slug]/page.tsx
components/product/ProductDetailsClient.tsx
components/product/ProductReviews.tsx
components/product/ProductPolicySummary.tsx
components/product/RelatedProducts.tsx
components/ui/ColorSwatch.tsx
lib/server/products.ts
lib/server/product-recommendations.ts
lib/server/product-policy-summary.ts
app/sitemap.ts
app/api/admin/products/migrate-colors/route.ts              optional migration
```

### Existing files to update

```text
app/product/page.tsx                                        legacy redirect/compatibility
app/shop/page.tsx
app/admin/page.tsx
app/api/products/route.ts
app/api/colors/route.ts
app/api/reviews/route.ts
app/api/admin/reviews/route.ts
app/api/admin/reviews/[id]/route.ts
app/api/shipping-policy/route.ts
app/api/returns-policy/route.ts
components/admin/CommerceAdminModule.tsx
components/admin/ShippingPolicyModule.tsx
components/admin/ReturnsPolicyModule.tsx
types/commerce.ts
lib/shipping-policy.ts
lib/returns-policy.ts
lib/utils.ts
```

Other price-rendering files must also be audited for `$` to keep PKR consistent.

---

## 23. Implementation Phases

### Phase 1 — PKR foundation

- Add PKR formatter.
- Set product API currency to PKR.
- Update Admin labels/placeholders.
- Update Product page and related cards.
- Audit Cart/Checkout/Wishlist/Orders.

Completion criteria:

- No customer-facing product price uses `$`.
- New products save `currency: 'PKR'`.

### Phase 2 — Colors single-source workflow

- Remove hardcoded Admin colors.
- Load Colors-module records.
- Save product `colorIds`.
- Validate IDs server-side.
- Add reusable ColorSwatch.
- Render selected product colors only.
- Update inventory variant logic.

Completion criteria:

- Admin selection exactly matches frontend options.
- No raw HEX appears on storefront.

### Phase 3 — Dynamic policy summary

- Add structured Shipping fields.
- Add structured Return fields.
- Update existing Admin modules.
- Add shared server summary loader.
- Replace hardcoded Product accordion.

Completion criteria:

- Policy changes appear on Product pages without code edits.
- PKR and delivery/return values are consistent.

### Phase 4 — Review hardening

- Verify approved-only flow.
- Synchronize product aggregates on moderation.
- Add pagination and submission guards.
- Add revalidation.

Completion criteria:

- Product rating/count matches approved reviews.
- Pending/rejected reviews never appear publicly.

### Phase 5 — SEO route refactor

- Add slug route.
- Add server product loader.
- Split interactive client component.
- Add `generateMetadata`.
- Add canonical/OG/Twitter.
- Add Product JSON-LD.
- Add sitemap.
- Redirect legacy URLs.

Completion criteria:

- Each active product has a crawlable unique URL and metadata.

### Phase 6 — Recommendations

- Add scored candidate selection.
- Add deterministic ordering.
- Add inventory/status filters.
- Add fallback chain.
- Add caching/revalidation.

Completion criteria:

- Related items match category, collection, and audience priorities.

### Phase 7 — End-to-end verification

- Build/type check.
- Browser verification.
- Mobile/desktop test.
- Admin Add/Edit Product test.
- Product-to-cart variant test.
- SEO validation.

---

## 24. Detailed Testing Checklist

### PKR

- Add Product shows PKR labels.
- Edit Product shows PKR labels.
- Product current price shows PKR.
- Discount price shows PKR.
- Original price shows PKR.
- Campaign price shows PKR.
- Related product prices show PKR.
- Cart/Checkout/Orders remain consistent.
- No `$` appears in commerce UI.

### Admin colors

- Add Product loads active Colors-module records.
- No hardcoded color list appears.
- Loading state appears.
- API failure shows Retry.
- Multi-select works.
- Solid colors preview correctly.
- Dual colors preview correctly.
- White/light swatches have borders.
- Selected IDs persist after save.
- Edit Product preselects saved IDs.
- Inactive colors cannot be newly selected.
- Referenced color deletion is prevented/warned.

### Frontend colors

- Only product-selected colors render.
- Correct color name appears.
- Correct HEX circle appears.
- No HEX text appears.
- Selected color resolves inventory variant.
- Out-of-stock combination is disabled.
- Legacy names resolve during migration period.
- Unknown IDs do not crash the page.

### Shipping & Returns

- Free shipping threshold uses PKR.
- Flat shipping rate uses PKR.
- Delivery range comes from Admin.
- Return window comes from Admin.
- Product summary updates after Admin save.
- Inactive summary hides.
- Policy links work.
- API failure uses neutral fallback.
- No mixed `$`/`Rs.` text remains.

### Reviews

- Only approved reviews display.
- Pending submission does not display immediately as approved.
- Admin approval updates count and average.
- Rejection removes it from approved summary.
- Verified purchase is server-controlled.
- Email is never exposed publicly.
- Rating breakdown is correct.
- Pagination/load more works.
- Duplicate/rate-limit protections behave correctly.

### SEO

- Product slug URL loads.
- Legacy query URL redirects.
- Page title contains product name and brand.
- Meta description is product-specific.
- Canonical is correct.
- OG title/description/image are correct.
- Twitter large image card is correct.
- Product JSON-LD contains PKR offer.
- AggregateRating appears only with approved reviews.
- Stock availability is correct.
- Draft/archived products are not indexable.
- Sitemap contains active slug URLs only.

### Recommendations

- Current product excluded.
- Same-category products rank highest.
- Shared collection improves ranking.
- Same audience improves ranking.
- Draft/archived products excluded.
- Out-of-stock handling follows policy.
- Results are deterministic.
- Maximum four cards render.
- Empty candidate list does not break layout.

### Technical

- Type checking passes.
- Production build passes.
- No hydration mismatch.
- No browser console errors.
- Mobile Product page works.
- Desktop Product page works.
- Add to Cart uses correct variant ID.

---

## 25. Acceptance Criteria

The feature set is complete when:

1. All product commerce prices use PKR.
2. New products are saved with PKR currency.
3. Add Product and Edit Product obtain colors only from the Colors module.
4. Products save validated `colorIds`.
5. Product frontend displays exactly the colors selected by Admin.
6. Color circles use Admin HEX/secondary HEX values.
7. Storefront never displays raw HEX text.
8. Color and size selections resolve the correct inventory variant.
9. Shipping and Returns Product-page content comes from existing Admin modules.
10. No mixed-dollar hardcoded Shipping text remains.
11. Reviews remain dynamic, approved-only, and aggregate correctly after moderation.
12. Every active product has a slug-based canonical URL.
13. Product metadata, social image, and JSON-LD are product-specific.
14. Draft/archived products are not indexed.
15. `You May Also Like` uses category, collection, audience, stock, and merchandising signals.
16. Recommendations are deterministic and exclude the current product.
17. Legacy product URLs and color-name records have a safe migration path.
18. Build, type checks, browser verification, and responsive testing pass.

---

## 26. Final End-to-End Architecture

```text
Admin Colors Module
        |
        v
Firestore colors
        |
        v
Add/Edit Product -----> validated colorIds[]
        |                       |
        |                       +------> inventory variants
        |                       |
        |                       +------> Product page swatches
        |                       |
        |                       +------> Shop filters/cards
        v
Product API (currency = PKR)
        |
        v
Product Server Loader
   /       |          |             \
  v        v          v              v
Colors   Policies   Reviews    Recommendations
   \       |          |             /
    \      |          |            /
     v     v          v           v
       /product/[slug]
              |
              +------> Product details/client interaction
              +------> PKR prices
              +------> dynamic Shipping & Returns
              +------> approved reviews
              +------> related products
              +------> metadata + OG/Twitter
              +------> Product JSON-LD
```

This architecture makes the Colors module the true source of product colors, keeps PKR consistent across the buying journey, reuses existing Shipping/Returns and Reviews systems, and gives every Product page professional recommendations and SEO.
