# Professional Color-Wise Product Gallery, Image Zoom, and Dynamic Cart Implementation Plan

## 1. Purpose

This document defines the complete implementation plan for:

1. Uploading multiple product images separately for every selected product color.
2. Switching the Product-page gallery when the customer selects a color.
3. Providing thumbnail navigation, desktop hover/click zoom, fullscreen image viewing, and mobile pinch/double-tap zoom.
4. Making the Cart page use PKR and dynamic store, shipping, promotion, product, inventory, color, and recommendation data.
5. Removing the hardcoded `Ribbed Knit Top`, `Linen Blend Shirt`, `Oversized Sweater`, and `Shoulder Bag` recommendation section.
6. Showing only active, in-stock bestseller recommendations in Cart, with a safe fallback to other active in-stock products.
7. Showing the exact applied promotion/coupon details instead of an empty `Promo ()` label.

This is an implementation plan only. No feature code is implemented by this document.

---

## 2. Current-State Audit

### Product gallery

Currently implemented:

- Admin can select multiple Product Image files.
- Product images are optimized to WebP.
- `product-images` documents are stored separately from the Product document.
- Product page can receive a flat `images[]` gallery.
- Selected color and exact inventory variant already use stable Color-module IDs.

Current gaps:

- Images are attached only to the Product, not to a specific `colorId`.
- `ProductImageDocument` has no color relationship.
- Admin has one shared upload field instead of an image manager for every selected color.
- Selecting Orange, Grey, Amber, etc. does not switch the gallery.
- Product page shows only one large image and does not provide a complete thumbnail gallery experience.
- No image zoom/lightbox behavior exists.
- Cart stores a generic selected image without formally guaranteeing that it belongs to the selected color.
- Product SEO cannot deliberately select a color-aware primary image.

### Cart page

Currently dynamic:

- Cart items and quantities come from `CartContext`.
- Product name, selected size, selected color, selected image, and item quantity are stored per cart line.
- Coupon eligibility and server checkout validation already exist.
- Checkout revalidates products, variants, inventory, prices, and promotions server-side.

Currently static or incomplete:

- Cart currency output still uses `$`.
- Shipping is hardcoded as `$5.00` with a `$75` free-shipping threshold.
- Cart totals are calculated from a percentage-only `promoDiscount` state.
- Applied promotion name, type, value, automatic/coupon mode, and eligibility explanation are not retained.
- `Promo ()` can render without a useful name/code.
- Recommendation products, remote images, prices, and Tailwind color classes are hardcoded.
- Recommendations do not check active status or current inventory.
- Cart quantity controls do not clearly prevent quantity from exceeding live variant stock.
- Cart can display stale product names, images, prices, promotions, or stock from `localStorage` until checkout.

---

## 3. Final Product Image Architecture

### Business rule

Every selected Product color may have its own complete gallery:

```text
Product
  ├─ Orange
  │    ├─ Primary/front image
  │    ├─ Back image
  │    ├─ Side image
  │    └─ Detail/lifestyle image
  └─ Grey
       ├─ Primary/front image
       ├─ Back image
       ├─ Side image
       └─ Detail/lifestyle image
```

Recommended minimum:

- At least one image for each sellable color.
- Recommended 3–5 images for each color.
- Maximum 8 images per color unless storage limits are revised.

The frontend must never display an Orange image while Grey is selected when a Grey gallery exists.

### Updated image document

Extend `ProductImageDocument` in `types/commerce.ts`:

```ts
interface ProductImageDocument {
  id: string;
  productId: string;
  colorId: string | null;
  dataUrl?: string;
  storagePath?: string;
  url?: string;
  originalName?: string;
  mimeType: 'image/webp';
  size: number;
  width: number;
  height: number;
  altText: string;
  role: 'primary' | 'gallery';
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

Rules:

- `productId` and `colorId` are the authoritative relationship.
- `colorId` must reference a color already assigned in `product.colorIds`.
- Exactly one image per color should have `role: 'primary'`.
- Images must have unique, stable IDs; reordering must not change IDs.
- `order` is scoped to one Product/color gallery.
- `colorId: null` is allowed only for a product with no color variants or for a documented legacy fallback gallery.
- Store dimensions and alt text for accessibility, SEO, and predictable layout.

### Product response shape

Return a normalized color-gallery structure:

```ts
interface ProductColorGallery {
  colorId: string | null;
  primaryImageId: string;
  images: Array<{
    id: string;
    url: string;
    altText: string;
    width: number;
    height: number;
    order: number;
  }>;
}

interface ProductGalleryPayload {
  galleriesByColorId: Record<string, ProductColorGallery>;
  defaultColorId: string | null;
  seoPrimaryImageUrl: string;
}
```

Do not put image base64 data inside Product-page RSC/JSON payloads. Use the managed binary route:

```text
/api/homepage-image/product/<imageId>
```

or rename it later to a clearer backward-compatible route:

```text
/api/product-images/<imageId>
```

---

## 4. Admin Add/Edit Product Image Workflow

### Required layout

Replace the single generic image uploader with a color-aware gallery manager.

For every selected color, render a panel:

```text
COLOR IMAGES — ORANGE
[ Upload images ]
[Primary] [Back] [Side] [Detail]

COLOR IMAGES — GREY
[ Upload images ]
[Primary] [Back] [Side] [Detail]
```

Each panel must support:

- Multi-file selection.
- Image preview.
- Drag-and-drop reordering.
- Set as primary.
- Edit alt text.
- Remove image with confirmation.
- Upload/optimization progress.
- Per-image validation error.
- Clear indication of the color name and actual Color-module swatch.

### Form state

Use Color IDs as keys:

```ts
type PendingProductImage = {
  localId: string;
  persistedId?: string;
  dataUrl?: string;
  previewUrl: string;
  altText: string;
  role: 'primary' | 'gallery';
  order: number;
  width: number;
  height: number;
};

type ProductImagesByColor = Record<string, PendingProductImage[]>;
```

Do not use the color name as the relationship key.

### Selection and removal rules

- Adding a color creates an empty image panel for that color.
- Product submission must clearly identify colors that have no images.
- A sellable color should require at least one image.
- Removing a Product color must warn if that color has images, variants, stock, reservations, or inventory history.
- Do not silently delete images or inventory.
- If removal is confirmed, archive the color variants and remove/archive its gallery in the same controlled workflow.
- Editing a legacy product must preserve its existing unassigned gallery until Admin maps it to a color.

### Image processing

Client-side preparation:

- Accepted input: JPEG, PNG, WebP.
- Reject SVG and non-image files.
- Correct EXIF orientation.
- Recommended maximum source dimension: 1,600–2,000 px.
- Convert to WebP.
- Suggested quality: `0.78–0.84`.
- Recommended final image size: maximum 750 KB each.
- Reject corrupt images and invalid dimensions.
- Preserve a consistent product-photo aspect ratio where practical without destructive cropping.

Server-side validation must repeat:

- MIME/data URL format.
- WebP magic bytes.
- Decoded size.
- Maximum images per color and maximum images per request.
- Referenced Product and Color existence.
- Color assignment to the Product.
- Admin authorization.

### Save atomicity

The Product record, color assignments, image documents, primary-image references, and variant updates should be committed as one logical operation.

- Validate everything before mutating Firestore.
- Prefer a Firestore batch when document limits permit.
- If image uploads use external storage, upload first to temporary paths, commit metadata, then promote/clean temporary files.
- A failed request must not leave a half-saved Product or orphaned images.
- Removed images should be recoverably archived or deleted only after the Product update succeeds.

---

## 5. Product Page Gallery Behavior

### Initial state

- Default selected color should be the first assigned color with an active, in-stock variant where possible.
- Load only that color's gallery as the active gallery.
- Select its primary image initially.
- If the selected color has no mapped gallery, use the documented legacy/default gallery and log the data issue for Admin.
- If no usable image exists, use `/product-placeholder.png`.

### Color switching

When the customer selects a different color:

1. Resolve the gallery using the selected `colorId`.
2. Reset the active image to that color's primary image.
3. Update thumbnails.
4. Recalculate valid size/stock selection.
5. Preserve quantity only if it is still valid; otherwise clamp/reset it.
6. Update the image that will be stored in Cart.
7. Preload the next likely image without downloading every full-size gallery upfront.

### Desktop layout

Recommended layout matching the supplied reference:

- Large primary image.
- Horizontal thumbnails below, or vertical thumbnails on wide screens.
- Selected thumbnail border/ring.
- Previous/next arrows when gallery has multiple images.
- Image count such as `2 / 5` where useful.
- Maintain image aspect ratio and prevent layout shift.

### Mobile layout

- Swipe between images.
- Thumbnail strip or pagination dots.
- Touch targets at least 44 × 44 px.
- Do not require hover.
- Lock background scrolling while fullscreen viewer is open.

### Accessibility

- Meaningful alt text derived from Product name, color name, and view, e.g. `Kids Summer Shorts in Amber — back view`.
- Thumbnail buttons must have descriptive `aria-label`s.
- Arrow-key thumbnail navigation on desktop.
- Escape closes zoom/lightbox.
- Focus is trapped inside the fullscreen viewer and restored to the opening control.
- Reduced-motion preference must disable nonessential zoom transitions.

---

## 6. Image Zoom and Fullscreen Viewer

Create reusable components:

```text
components/product/ProductImageGallery.tsx
components/product/ProductImageZoom.tsx
components/product/ProductImageLightbox.tsx
```

### Desktop zoom

Required behavior:

- Hover or pointer movement may show a magnified region.
- Click opens a fullscreen/lightbox viewer.
- Magnification should follow pointer position without moving the page.
- Zoom should use the original managed image, not a visibly pixelated thumbnail.
- Provide `+`, `−`, reset, previous, next, and close controls.
- Clamp pan boundaries so blank space is not exposed.

### Mobile zoom

- Tap opens fullscreen viewer.
- Pinch-to-zoom.
- Double-tap to zoom/reset.
- Drag to pan only while zoomed.
- Horizontal swipe changes image only when zoom is at its base scale.

### Performance and safety

- Use `next/image` for the normal gallery.
- Mark only the initial above-the-fold primary image as `priority`.
- Provide accurate `sizes`.
- Lazy-load nonactive full-size images.
- Avoid serializing raw base64 image data.
- Do not depend on a large zoom library unless it materially reduces complexity and bundle impact is measured.
- Clean up pointer/touch listeners and object URLs on unmount.

---

## 7. Cart Line Data and Revalidation

### Cart item shape

Extend `CartItem` so a line has stable IDs and a color-correct image snapshot:

```ts
interface CartItem {
  id: number;
  productId: string;
  productSlug: string;
  variantId: string;
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;
  imageId: string | null;
  img: string;
  name: string;
  unitPrice: number;
  qty: number;
  availableStock?: number;
}
```

Rules:

- Add to Cart must use the selected color gallery's current/primary image.
- Line identity should use `variantId`, not a name-based `id + size + color` comparison.
- Color/size names are display snapshots only; IDs are authoritative.
- Existing localStorage cart data needs a versioned migration.
- Invalid legacy lines that cannot resolve a real variant should be removed with a clear customer message, not silently checked out.

### Cart validation endpoint

Add a server-owned cart quote endpoint:

```text
POST /api/cart/quote
```

Request:

```ts
{
  items: Array<{ variantId: string; quantity: number }>;
  couponCode?: string | null;
}
```

The browser must not be trusted for names, images, price, stock, shipping, or discount amounts.

Response:

```ts
interface CartQuote {
  currency: 'PKR';
  lines: CartQuoteLine[];
  itemCount: number;
  subtotalBeforeDiscount: number;
  automaticDiscountAmount: number;
  couponDiscountAmount: number;
  discountAmount: number;
  discountedSubtotal: number;
  shipping: {
    type: 'free' | 'flat';
    amount: number;
    freeShippingThreshold: number | null;
    remainingForFreeShipping: number;
    label: string;
  };
  appliedPromotions: AppliedPromotionSummary[];
  rejectedCoupon?: { code: string; reason: string };
  total: number;
  quotedAt: string;
}
```

`CartQuoteLine` should return current Product/variant data including current price, stock, selected Color-module record, selected size, and the correct color-specific primary image.

### Revalidation triggers

Refresh the quote when:

- Cart opens.
- Quantity changes.
- Item is removed.
- Coupon is applied/removed.
- Authentication changes.
- Window regains focus after a reasonable stale interval.

Use request cancellation/debouncing to prevent race conditions. The latest request must win.

### Quantity and stock

- Disable `+` at current available stock.
- Show a clear stock message when requested quantity is reduced by server validation.
- Remove or disable out-of-stock lines and prevent checkout.
- Do not allow negative, zero, fractional, NaN, or excessive quantities.
- Checkout remains the final transaction-safe source of truth.

---

## 8. Dynamic PKR Cart Pricing

Use the shared `formatPkr()` helper everywhere in Cart:

- Unit price.
- Line total.
- Subtotal.
- Automatic promotion saving.
- Coupon saving.
- Shipping.
- Free-shipping progress amount.
- Grand total.
- Recommendation prices.

Remove:

```ts
const SHIPPING_FLAT = 5.00;
const FREE_SHIP_THRESHOLD = 75;
```

Shipping values must come from the existing structured Shipping Policy settings:

- `freeShippingEnabled`
- `freeShippingThreshold`
- `flatRateEnabled`
- `flatRate`

The quote and checkout must share the same shipping calculation helper so Cart cannot show a different total from Checkout.

Recommended helper:

```text
lib/server/commerce-pricing.ts
```

It should own:

- Effective Product/variant prices.
- Automatic promotion selection.
- Coupon eligibility.
- Stacking rules.
- Maximum-discount cap.
- Shipping quote.
- PKR-safe rounding.

---

## 9. Promotion Details on Cart

### Current problem

`promoDiscount` stores only a calculated ratio and `promoCodeApplied` may be empty for automatic promotions. The UI therefore loses the actual promotion identity and can show:

```text
Promo ()
```

### Required model

```ts
interface AppliedPromotionSummary {
  id: string;
  name: string;
  publicMessage: string;
  mode: 'automatic' | 'coupon';
  code: string | null;
  discountType: 'percentage' | 'fixed' | 'free-shipping';
  discountValue: number;
  discountAmount: number;
  eligibleSubtotal: number;
  minimumOrder: number;
  maximumDiscount: number | null;
}
```

### Required UI

Examples:

```text
Summer Sale — Automatic 20% off       −PKR 1,100
WELCOME10 — 10% coupon                −PKR 500
Free Shipping Promotion              −PKR 500
```

The expandable/detail view should show:

- Promotion/campaign public name.
- Coupon code when applicable.
- Automatic or coupon badge.
- Percentage/fixed/free-shipping rule.
- Minimum order requirement.
- Maximum discount cap where configured.
- Actual saving applied to this Cart.
- A useful reason when the coupon is rejected.

Rules:

- Never render empty parentheses.
- Do not claim a coupon is applied until the server quote accepts it.
- Provide a Remove coupon action.
- Do not display internal Admin notes or IDs.
- Automatic and coupon promotions must obey the existing `stackable` rules.
- Avoid subtracting a Product campaign price and the same discount again at Cart level.

---

## 10. Dynamic Cart Recommendations

### Remove hardcoded content

Delete the static `relatedSuggestions` array and its remote Unsplash data:

- Ribbed Knit Top
- Linen Blend Shirt
- Oversized Sweater
- Shoulder Bag

### Preferred replacement

Rename the section to:

```text
BEST SELLERS
```

or keep `YOU MAY ALSO LIKE` only if a real recommendation endpoint is used.

Add:

```text
GET /api/cart/recommendations?exclude=<productIds>&limit=4
```

Selection rules, in order:

1. Product status is active.
2. Total available stock is greater than zero.
3. At least one active exact variant is in stock.
4. Exclude every Product already in Cart.
5. Prefer `bestsellerOverride`, sales count, aggregate rating, and featured status.
6. Prefer category, collection, or audience overlap with Cart contents as a secondary score.
7. Use deterministic ordering.
8. Return at most four unique products.
9. If no qualifying bestsellers exist, use other active in-stock featured/relevant products.
10. If no safe products exist, hide the section completely.

Do not show:

- Draft/archived products.
- Products with zero available stock.
- Products already in Cart.
- Duplicate products.
- Placeholder/demo products that are not Firestore catalog records.

### Recommendation cards

Reuse existing Product card and `ColorSwatch` behavior:

- Real Product image.
- Product name.
- PKR effective price.
- Discount/retail price where applicable.
- Colors from the Colors module.
- Link to `/product/<slug>`.
- Optional Quick Add only when exact variant selection is safely supported.

---

## 11. Cart Page Component Architecture

Refactor the large Cart page into focused components:

```text
app/cart/page.tsx
components/cart/CartClient.tsx
components/cart/CartLineItem.tsx
components/cart/CartQuantityControl.tsx
components/cart/CartOrderSummary.tsx
components/cart/CartPromotionDetails.tsx
components/cart/CartRecommendations.tsx
components/cart/FreeShippingProgress.tsx
components/cart/CartSkeleton.tsx
components/cart/CartErrorState.tsx
```

Suggested responsibility:

- Server page: load public settings/recommendation seed where appropriate.
- Client boundary: local cart interaction, quote requests, coupon form.
- API: authoritative price, promotion, stock, shipping, and image resolution.

Required states:

- Hydrating local cart.
- Quoting/recalculating.
- Empty cart.
- Valid cart.
- Stale price changed.
- Quantity adjusted due to stock.
- Out-of-stock line.
- Coupon accepted/rejected.
- API failure with Retry.
- Recommendation loading/empty/error.

Avoid showing `0 items` before localStorage hydration completes.

---

## 12. API and Security Requirements

### Product image mutations

- Admin authentication required.
- Validate Product and assigned Color IDs server-side.
- Reject unknown/inactive newly assigned colors.
- Reject arbitrary Firestore document paths.
- Enforce request and decoded-image size limits.
- Enforce allowed image count.
- Validate WebP bytes rather than trusting the browser MIME string.
- Revalidate Product, Shop, Cart recommendations, sitemap, and Product metadata after changes.

### Cart quote

- Public endpoint may be used by guests but must accept only minimal IDs/quantities.
- Apply request-size and item-count limits.
- Load all authoritative records server-side.
- Do not trust browser price, Product name, selected image, stock, shipping, discount, or user ID.
- Verify authenticated user from the token for login-required promotions.
- Never increment promotion usage during quoting; redemption occurs only in checkout transaction.
- Return generic safe errors and log detailed server errors privately.
- Add rate limiting when production infrastructure supports it.

### Checkout parity

Refactor `/api/checkout` and `/api/cart/quote` to call the same pricing function. Checkout must recalculate inside its transaction and may reject a stale quote.

---

## 13. Migration Plan

### Existing Product images

Existing `product-images` records have no `colorId`.

Migration strategy:

1. Keep them temporarily as the Product's legacy/default gallery.
2. In Edit Product, show a `Legacy unassigned images` panel.
3. Allow Admin to assign each image to a selected color.
4. Require mapping before strict per-color image validation is enabled for that Product.
5. Never automatically duplicate the same legacy image into every color as if it were color-accurate.

Optional protected migration endpoint:

```text
POST /api/admin/products/migrate-color-galleries
```

It must support dry-run output and must not guess colors from filenames without Admin confirmation.

### Existing Cart localStorage

Introduce:

```text
cr_cart_v2
```

Migration behavior:

- Resolve old `id/size/color` values to a real variant.
- Replace stale price/image/name with quote response values.
- Use the selected color's primary image.
- Remove unresolvable lines with one clear notification.
- Do not keep invalid legacy lines indefinitely.

### Existing PKR values

Do not multiply Product prices by an exchange rate. Existing numeric values remain PKR and Admin must correct unrealistic demo values manually.

---

## 14. Suggested File Changes

### New files

```text
components/product/ProductImageGallery.tsx
components/product/ProductImageZoom.tsx
components/product/ProductImageLightbox.tsx
components/admin/ProductColorGalleryManager.tsx
components/cart/CartClient.tsx
components/cart/CartLineItem.tsx
components/cart/CartQuantityControl.tsx
components/cart/CartOrderSummary.tsx
components/cart/CartPromotionDetails.tsx
components/cart/CartRecommendations.tsx
components/cart/FreeShippingProgress.tsx
components/cart/CartSkeleton.tsx
components/cart/CartErrorState.tsx
app/api/cart/quote/route.ts
app/api/cart/recommendations/route.ts
lib/server/commerce-pricing.ts
lib/server/product-galleries.ts
lib/cart-types.ts
```

### Existing files to update

```text
types/commerce.ts
lib/products.ts
lib/server/products.ts
app/admin/page.tsx
app/api/products/route.ts
app/api/homepage-image/[kind]/[id]/route.ts
app/product/[slug]/page.tsx
components/product/ProductDetailsClient.tsx
context/CartContext.tsx
app/cart/page.tsx
app/api/promotions/apply/route.ts
app/api/checkout/route.ts
lib/shipping-policy.ts
lib/utils.ts
```

Optional migration/test files:

```text
app/api/admin/products/migrate-color-galleries/route.ts
lib/server/commerce-pricing.test.ts
lib/server/product-galleries.test.ts
components/product/ProductImageGallery.test.tsx
e2e/product-color-gallery.spec.ts
e2e/cart-quote.spec.ts
```

---

## 15. Implementation Phases

### Phase 1 — Image schema and server data

- Extend Product image types.
- Add `colorId`, dimensions, alt text, stable order, and primary role.
- Add normalized gallery server helper.
- Update managed image response and Product SEO image resolution.

Completion criteria:

- Server can return an ordered gallery for each assigned Color ID without exposing base64.

### Phase 2 — Admin color gallery manager

- Add one image panel per selected color.
- Upload, optimize, reorder, set primary, edit alt text, and remove.
- Add validation and legacy unassigned image workflow.
- Save atomically with Product colors/variants.

Completion criteria:

- Admin can independently manage Orange and Grey galleries on both Add and Edit Product.

### Phase 3 — Product gallery and zoom

- Add primary image, thumbnails, color switching, arrows, lightbox, zoom, swipe, and accessibility.
- Ensure Add to Cart captures the selected color image.

Completion criteria:

- Selecting each color immediately shows only that color's correct images and zoom works on desktop/mobile.

### Phase 4 — Authoritative Cart quote

- Add shared pricing service and `/api/cart/quote`.
- Resolve current Products, variants, stock, images, promotions, and shipping.
- Version/migrate Cart storage.
- Prevent quantity beyond live stock.

Completion criteria:

- Cart values match Checkout and no `$` or hardcoded shipping remains.

### Phase 5 — Promotion detail UX

- Replace percentage-only promo state with full applied-promotion summaries.
- Show automatic and coupon details, savings, rules, rejection reason, and Remove action.
- Prevent double discounts.

Completion criteria:

- `Promo ()` is impossible and the exact applied promotion is understandable.

### Phase 6 — Dynamic recommendations

- Remove all four hardcoded products.
- Add in-stock bestseller/relevant-product endpoint.
- Reuse dynamic Product cards, PKR formatter, images, and Color-module swatches.

Completion criteria:

- Only real, active, in-stock catalog products render; section hides when none qualify.

### Phase 7 — Verification

- Type check.
- Production build.
- Desktop/mobile browser tests.
- Hydration and console checks.
- Admin Add/Edit image workflow tests.
- Promotion/stock/shipping parity tests.

---

## 16. Testing Checklist

### Admin and color galleries

- Add Product with Orange and Grey.
- Upload multiple distinct images for Orange.
- Upload multiple distinct images for Grey.
- Set a primary image independently for each color.
- Reorder images and confirm order persists.
- Edit alt text and confirm accessible output.
- Reject invalid MIME, corrupt, oversized, and excessive images.
- Prevent an image from referencing a color not assigned to the Product.
- Warn before removing a color with images/stock/history.
- Failed save does not create orphan images or partial Product records.
- Legacy unassigned gallery remains visible and assignable.

### Product page

- Orange selection shows Orange primary image and thumbnails.
- Grey selection shows Grey primary image and thumbnails.
- Switching colors resets to correct primary image.
- Back/side/detail thumbnails work.
- Desktop pointer zoom works.
- Fullscreen open/close, arrows, zoom controls, pan, and Escape work.
- Mobile swipe, pinch, double-tap, and pan work.
- White/light UI controls remain visible over light images.
- Broken/missing gallery uses safe fallback.
- Cart receives the selected Color ID, variant ID, and matching color image.
- SEO/OG uses an HTTP Product image, not base64.

### Cart PKR and shipping

- No `$` remains anywhere on `/cart`.
- Unit and line totals use PKR.
- Subtotal, discounts, shipping, and total use PKR.
- Shipping threshold/rate match Admin Shipping Policy.
- Free shipping is correctly applied.
- Remaining amount for free shipping is accurate.
- Cart and Checkout totals match for the same state.

### Cart stock and stale data

- Quantity cannot exceed variant stock.
- Stock changes after adding are reflected on Cart reload/requote.
- Out-of-stock lines are blocked from checkout.
- Archived/deleted Product line is handled clearly.
- Stale Product price is refreshed from server.
- Selected Cart image remains correct for the selected color.
- Quote race conditions do not overwrite newer quantity changes.

### Promotions

- Automatic percentage promotion shows name, mode, value, and saving.
- Automatic fixed promotion shows correct PKR saving.
- Coupon shows code and public campaign name.
- Minimum order failure explains the requirement in PKR.
- Maximum-discount cap is reflected.
- Login-required coupon behaves correctly for guest/user.
- Expired, inactive, invalid, exhausted, and over-user-limit coupons show safe reasons.
- Remove coupon recalculates totals.
- Empty `Promo ()` never renders.
- Automatic and coupon discounts are not double-counted.

### Recommendations

- Four hardcoded demo products are removed.
- Cart products are excluded.
- Draft/archived products are excluded.
- Zero-stock products and variants are excluded.
- Bestsellers are preferred.
- Real images, slugs, PKR prices, and dynamic color swatches render.
- Section hides when no safe recommendation exists.

### Quality

- No React hydration warning/error `#418`.
- No console errors.
- No broken image requests.
- Keyboard and screen-reader gallery controls work.
- Mobile and desktop layouts remain usable.
- TypeScript passes.
- Production build passes.

---

## 17. Acceptance Criteria

The work is complete only when:

1. Admin can upload and manage multiple independent images for every selected Product color.
2. Product images are stored with stable Product and Color IDs.
3. Selecting Orange displays Orange images and selecting Grey displays Grey images.
4. Every color gallery supports a primary image and ordered thumbnails.
5. Desktop and mobile image zoom/fullscreen behavior works accessibly.
6. The selected color's correct image is stored/displayed in Cart and Order snapshots.
7. Cart contains no hardcoded Product, image, price, color, shipping, or recommendation data.
8. Cart uses PKR everywhere.
9. Cart shipping comes from Admin Shipping Policy settings.
10. Cart totals come from a server-authoritative quote shared with Checkout pricing logic.
11. Applied automatic/coupon promotion details and exact savings are visible.
12. `Promo ()` can never render.
13. The four named hardcoded recommendation products are removed.
14. Cart recommendations contain only real active, in-stock products and exclude Cart contents.
15. Out-of-stock recommendations never render.
16. Type checking, production build, browser console, desktop, and mobile tests pass.

---

## 18. Final Data Flow

```text
Admin Colors Module
        |
        v
Product selected colorIds
        |
        +----> Color-aware Admin gallery panels
        |                 |
        |                 v
        |       product-images (productId + colorId)
        |                 |
        |                 v
        +----> Product gallery + thumbnails + zoom
                          |
                  selected color image
                          |
                          v
                    Cart variant line
                          |
                          v
                    /api/cart/quote
                /        |          \
               v         v           v
       live inventory  promotions  shipping settings
               \         |           /
                \        v          /
                 PKR totals + promotion details
                          |
                          v
             shared validation in Checkout

Active Products + Variant Stock + Bestseller/Rating/Sales
                          |
                          v
             /api/cart/recommendations
                          |
                          v
         Real in-stock PKR Product cards only
```

This architecture keeps each Product color visually accurate, gives customers a professional gallery/zoom experience, and makes the Cart consistent with live Products, inventory, promotions, shipping settings, and Checkout.
