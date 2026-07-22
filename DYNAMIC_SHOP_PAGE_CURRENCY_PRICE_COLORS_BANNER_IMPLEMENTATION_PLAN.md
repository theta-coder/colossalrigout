# Dynamic Shop Page — PKR Currency, Product Price Range, Color Swatches, and Banner Plan

## 1. Objective

Improve the `/shop` page by implementing four focused changes:

1. Display all Shop-page product prices in Pakistani Rupees (`PKR`).
2. Generate the price filter minimum and maximum automatically from real product prices.
3. Load color filters and product color circles from the existing Admin **Colors** module.
4. Make the Shop banner background image manageable from Admin.

This plan intentionally keeps standard UI labels such as `PRICE`, `COLOR`, `LOAD MORE`, sorting labels, breadcrumb labels, and filter headings hardcoded.

---

## 2. Current Problems

### Currency

Current file:

```text
app/shop/page.tsx
```

The Shop page currently prints prices using hardcoded dollar formatting:

```tsx
${p.price.toFixed(2)}
```

The price slider also displays:

```text
$10
$200
$200+
```

This is incorrect for a Pakistani store.

### Price range

The Shop filter currently uses fixed values:

```ts
const [priceRange, setPriceRange] = useState<number>(200);
```

```tsx
min="10"
max="200"
```

This range does not reflect the products in the catalog. If the cheapest product is PKR 1,000 and the most expensive product is PKR 10,000, the slider should automatically cover PKR 1,000–PKR 10,000.

### Colors

The page currently has a hardcoded Tailwind mapping:

```ts
const colorClasses = {
  Black: 'bg-black',
  Stone: 'bg-stone-300',
  Navy: 'bg-blue-900',
  Blue: 'bg-blue-600',
  White: 'bg-white',
  Grey: 'bg-neutral-500',
  Amber: 'bg-amber-800',
};
```

However, the project already has a dynamic Colors module with these fields:

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
}
```

The Shop page is not using this data for its filter or product swatches.

### Shop banner

The Shop banner currently uses the static brand logo:

```tsx
<Image src="/colossal-rigout-logo.png" ... />
```

There is no Admin setting for changing this banner image.

---

## 3. Scope

### Included

- PKR formatting on every price shown within `/shop`.
- PKR formatting in product cards, discounted prices, Quick Add modal, and price filters.
- Automatic minimum and maximum from real effective product prices.
- Automatic slider reset/clamping when category, collection, search, campaign, or audience changes.
- Dynamic Colors-module fetching.
- Solid and dual-color circle rendering.
- No raw HEX text on the storefront.
- Color filtering by stable color IDs, with backward compatibility for old name-based products.
- Admin-managed Shop banner image.
- Shop-banner image validation and optimization.
- Fallback banner image when Firebase data is unavailable.
- Cache invalidation after banner update.
- Desktop and mobile filter parity.

### Not included

- Currency selector for customers.
- Multiple currencies or live exchange rates.
- Dynamic filter labels.
- Dynamic sorting labels.
- Dynamic `Load More` label.
- Dynamic Shop breadcrumb labels.
- Dynamic banner heading logic; it will remain contextual based on selected group/category/search/campaign.
- Redesign of product cards.

---

## 4. Currency Strategy

### Store currency

Use one fixed store currency:

```ts
currency: 'PKR'
locale: 'en-PK'
```

PKR is a business configuration, not a live exchange-rate feature.

### Recommended formatter

Create or extend:

```text
lib/utils.ts
```

Recommended helper:

```ts
export function formatPkr(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
```

Expected output:

```text
PKR 1,000
PKR 10,000
PKR 12,500
```

Why a shared formatter is required:

- Prevents `$` from remaining in one part of the Shop page.
- Adds thousands separators consistently.
- Avoids repeated `.toFixed(2)` formatting.
- Keeps future changes centralized.
- Handles invalid values safely.

### Shop locations that must be updated

Replace hardcoded dollar formatting in:

- Normal product price.
- Discounted product price.
- Original/struck-through retail price.
- Campaign price.
- Quick Add modal price.
- Price filter minimum.
- Current selected maximum.
- Price filter maximum.

Example:

```tsx
<span>{formatPkr(product.price)}</span>
```

No `$` symbol should remain anywhere inside `app/shop/page.tsx` after implementation.

---

## 5. Product Price Definition

The range must use the **effective customer price**, not always the retail price.

Recommended helper:

```ts
function getEffectiveProductPrice(product: CatalogProduct): number {
  const campaignPrice = Number((product as any).campaignDiscountApplied ? product.price : NaN);
  if (Number.isFinite(campaignPrice) && campaignPrice > 0) return campaignPrice;

  const discountPrice = Number((product as any).discountPrice);
  const retailPrice = Number((product as any).retailPrice ?? product.price);

  if (
    Number.isFinite(discountPrice) &&
    discountPrice > 0 &&
    Number.isFinite(retailPrice) &&
    discountPrice < retailPrice
  ) {
    return discountPrice;
  }

  const price = Number(product.price ?? retailPrice);
  return Number.isFinite(price) && price > 0 ? price : 0;
}
```

Rules:

- Active campaign price has first priority.
- Valid manual discount price has second priority.
- Retail/current price is the fallback.
- Zero, negative, `NaN`, and missing prices are excluded from range calculation.

---

## 6. Dynamic Minimum and Maximum Price Range

### Required behavior

If available product prices are:

```text
PKR 1,000
PKR 2,500
PKR 4,000
PKR 10,000
```

The filter must show:

```text
Minimum: PKR 1,000
Maximum: PKR 10,000
```

### Correct filter pipeline

Avoid calculating the range from the final product list after the price filter has already been applied. That creates a circular filter where lowering the slider also lowers its own maximum.

Use two stages:

```text
productsSource
    |
    v
non-price filters
(search, audience, category, collection, tags, colors, sizes)
    |
    +----> calculate min/max range
    |
    v
price filter
    |
    v
sorting
    |
    v
visible products
```

Recommended variables:

```ts
const productsBeforePriceFilter = productsSource.filter(/* all filters except price */);

const priceBounds = useMemo(() => {
  const prices = productsBeforePriceFilter
    .map(getEffectiveProductPrice)
    .filter(price => Number.isFinite(price) && price > 0);

  if (prices.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.floor(Math.min(...prices)),
    max: Math.ceil(Math.max(...prices)),
  };
}, [productsBeforePriceFilter]);
```

### Slider state

Use a maximum-price filter state:

```ts
const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | null>(null);
```

Resolved slider value:

```ts
const effectiveSelectedMax = selectedMaxPrice ?? priceBounds.max;
```

When the product context changes:

```ts
useEffect(() => {
  setSelectedMaxPrice(priceBounds.max);
}, [priceBounds.min, priceBounds.max]);
```

Alternative behavior is to clamp instead of always reset:

```ts
setSelectedMaxPrice(current => {
  if (current === null) return priceBounds.max;
  return Math.min(Math.max(current, priceBounds.min), priceBounds.max);
});
```

Recommended UX:

- Reset to the new maximum when the main shopping context changes.
- Keep/clamp the value for unrelated UI changes such as sorting.

### Slider step

Use a sensible dynamic step:

```ts
function getPriceStep(min: number, max: number): number {
  const spread = max - min;
  if (spread <= 1000) return 50;
  if (spread <= 5000) return 100;
  if (spread <= 20000) return 500;
  return 1000;
}
```

For PKR 1,000–PKR 10,000, the recommended step is PKR 500 or PKR 100. PKR 500 offers cleaner movement; PKR 100 offers finer control. Use PKR 100 if catalog prices commonly differ by small amounts.

### Filtering rule

```ts
const filteredProducts = productsBeforePriceFilter.filter(product => {
  const price = getEffectiveProductPrice(product);
  return price > 0 && price <= effectiveSelectedMax;
});
```

### Edge cases

#### No valid products

- Hide or disable the price slider.
- Show `No price range available` if necessary.
- Do not set invalid range attributes.

#### Only one product price

If minimum equals maximum:

- Disable the slider.
- Show the same PKR value once or on both ends.

#### Campaign products

- When the Shop page is showing a campaign subset, calculate bounds from that subset.
- Use campaign-adjusted prices.

#### Search/category/collection

- Price bounds should reflect the selected product context.
- Example: Dresses can have their own min/max, while All Products has a broader range.

### Clear filters

`CLEAR ALL FILTERS` must reset:

```ts
setSelectedMaxPrice(priceBounds.max);
```

It must no longer reset to hardcoded `200`.

---

## 7. Dynamic Colors from the Existing Colors Module

### Existing source

Use:

```http
GET /api/colors
```

The API already returns Firestore Colors-module records including:

- `id`
- `name`
- `slug`
- `hex`
- `secondaryHex`
- `swatchType`
- `active`
- `order`

### Shop state

Add:

```ts
const [availableColors, setAvailableColors] = useState<ColorDocument[]>([]);
const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
```

Fetch behavior:

```ts
useEffect(() => {
  fetch('/api/colors')
    .then(response => response.json())
    .then(payload => {
      const colors = Array.isArray(payload.colors) ? payload.colors : [];
      setAvailableColors(
        colors
          .filter(color => color.active !== false)
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      );
    })
    .catch(() => setAvailableColors([]));
}, []);
```

Prefer reusing the existing commerce data loader if the Shop page is later refactored to server-side data fetching.

### Which colors should appear in the filter

Do not show every Admin color if no currently available product uses it.

Recommended behavior:

1. Load all active Colors-module records.
2. Collect color IDs used by the current product source.
3. Show only active colors referenced by at least one relevant product.
4. Preserve Admin order.

```ts
const usedColorIds = new Set(
  productsSource.flatMap(product => product.colorIds || [])
);

const filterColors = availableColors.filter(color => usedColorIds.has(color.id));
```

Backward compatibility:

- Some legacy products may store color names rather than `colorIds`.
- Temporarily match legacy names using case-insensitive `color.name` comparison.
- New/updated products must use color IDs.

### Swatch rendering

Create a small reusable component:

```text
components/ui/ColorSwatch.tsx
```

Recommended props:

```ts
interface ColorSwatchProps {
  color: ColorDocument;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  title?: string;
  className?: string;
}
```

Solid color style:

```ts
{ backgroundColor: color.hex }
```

Dual color style:

```ts
{
  background: `linear-gradient(135deg, ${color.hex} 50%, ${color.secondaryHex} 50%)`
}
```

Storefront rule:

- Show only the visual circle.
- Do not print HEX text such as `#000000`.
- Use the color name only in `title` and `aria-label` for accessibility.

Example:

```tsx
<button aria-label={`Filter by ${color.name}`} title={color.name}>
  <ColorSwatch color={color} selected={selectedColorId === color.id} />
</button>
```

### White and very light colors

Light swatches can disappear against a white background. Always apply:

```text
border: 1px solid neutral-300
```

### Color filter matching

Preferred matching:

```ts
product.colorIds?.includes(selectedColorId)
```

Legacy fallback:

```ts
const selectedColor = availableColors.find(color => color.id === selectedColorId);
product.colors?.some(name => name.toLowerCase() === selectedColor?.name.toLowerCase())
```

### Product card color circles

The same `ColorSwatch` component must be used beneath each product card.

Current name-to-Tailwind rendering must be removed:

```tsx
className={colorClasses[colorName]}
```

New rendering:

```tsx
{product.colorIds?.map(colorId => {
  const color = colorById.get(colorId);
  return color ? <ColorSwatch key={colorId} color={color} size="sm" /> : null;
})}
```

### Quick Add modal colors

The Quick Add modal must also use dynamic Colors-module swatches.

Selection state should use a stable color ID:

```ts
const [quickColorId, setQuickColorId] = useState('');
```

Inventory variant matching should continue using `variant.colorId`.

The customer may see the selected color name beside the selector, but never the HEX value.

---

## 8. Shop Banner Data Model

Add one fixed settings document:

```text
shop-page-settings/banner
```

Recommended schema:

```ts
interface ShopBannerSettings {
  id: 'banner';
  enabled: boolean;
  imagePath: string;
  imageAlt: string;
  overlayOpacity: number;
  imagePosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
  updatedAt: string;
  updatedBy: string;
}
```

Recommended defaults:

```json
{
  "enabled": true,
  "imagePath": "shop-page-images/banner",
  "imageAlt": "Colossal Rigout shop collection",
  "overlayOpacity": 0.6,
  "imagePosition": "center"
}
```

### Image document

Use a separate fixed image document:

```text
shop-page-images/banner
```

Schema:

```ts
interface ShopBannerImageDocument {
  id: 'banner';
  dataUrl: string;
  mimeType: 'image/webp';
  width: number;
  height: number;
  updatedAt: string;
}
```

Why separate the image:

- Keeps settings payload small.
- Prevents base64 image data from being included in page/RSC JSON.
- Allows a binary image API to serve the decoded image.
- Matches the project's existing managed-image approach.

### Fallback

If no Admin image exists or the image endpoint fails:

```text
/colossal-rigout-logo.png
```

The Shop page must never lose its banner because Firebase is unavailable.

---

## 9. Banner Image Upload Requirements

### Admin image processing

Before upload:

- Accept JPEG, PNG, or WebP.
- Reject non-image files.
- Recommended aspect ratio: `16:5` or approximately `3.2:1`.
- Resize to maximum width of 1,600 px.
- Resize to maximum height of 650 px.
- Convert to WebP.
- Use quality around `0.76–0.82`.
- Reject final data URL larger than 750 KB.

Suggested helper:

```ts
async function optimizeShopBannerImage(file: File): Promise<string>
```

The preview must use the optimized image, not the original local file.

### Display behavior

- Continue using `next/image`.
- Use `fill` and `priority` because the banner is above the fold.
- Keep a dark overlay for readable contextual headings.
- Overlay opacity must be configurable between `0.2` and `0.85`.
- Keep the current dynamic heading and product count logic.

---

## 10. Banner APIs

### Public settings route

Create:

```text
app/api/shop-page-settings/route.ts
```

Supported request:

```http
GET /api/shop-page-settings
```

Response:

```json
{
  "success": true,
  "data": {
    "banner": {
      "enabled": true,
      "imageUrl": "/api/shop-banner-image",
      "imageAlt": "Colossal Rigout shop collection",
      "overlayOpacity": 0.6,
      "imagePosition": "center"
    }
  }
}
```

Do not expose the base64 image through this JSON route.

### Public image route

Create:

```text
app/api/shop-banner-image/route.ts
```

Behavior:

- Read `shop-page-images/banner`.
- Validate the stored data URL.
- Decode it to binary.
- Return correct `Content-Type`.
- Add cache headers.
- Redirect to the static logo fallback if invalid or missing.

Recommended cache header:

```text
Cache-Control: public, max-age=300, stale-while-revalidate=3600
```

Optional cache-busting query:

```text
/api/shop-banner-image?v=<updatedAt>
```

### Protected Admin route

Create:

```text
app/api/admin/shop-page-settings/route.ts
```

Supported requests:

```http
GET /api/admin/shop-page-settings
PUT /api/admin/shop-page-settings
```

Update payload should be `multipart/form-data` because it may include image data plus settings.

Security:

- Use `requireAdmin()`.
- Use `adminApiFetch()` from the Admin UI.
- Validate every field server-side.
- Never trust `updatedBy` from the browser.
- Reject oversized bodies.
- Reject invalid data URL formats.
- Store only WebP image data produced by the client and revalidate format on server.

After save:

```ts
revalidatePath('/shop');
revalidateTag('shop-page-settings');
revalidateTag('shop-page-settings:banner');
```

---

## 11. Server Data Layer for Banner

Create:

```text
lib/shop-page-settings.ts
lib/server/shop-page-settings.ts
```

Shared file responsibilities:

- TypeScript interfaces.
- Default banner settings.
- Normalization.
- Validation.
- Safe overlay range clamping.
- Safe image-position enum.

Server helper:

```ts
getShopBannerSettings(): Promise<ShopBannerSettings>
```

Requirements:

- Return defaults when document is missing.
- Return defaults when Firebase fails.
- Do not return image base64.
- Use cache tags.
- Use the project’s working Firebase SDK fallback if REST returns a permission error.

---

## 12. Admin Dashboard Integration

Recommended location:

- Extend the existing **Storefront Content** module with a fifth section named `Shop Page`, or
- Add a dedicated `Shop Page Settings` tab.

Preferred option:

```text
Storefront Content → Shop Page
```

This keeps global content settings together without adding another large Admin navigation item.

### Admin fields

- Banner enabled toggle.
- Banner image upload.
- Current banner image preview.
- Image alt text.
- Image position selector.
- Overlay opacity slider.
- Save button.
- Restore default banner button.

### Preview

The Admin preview should include:

- Uploaded/optimized image.
- Dark overlay.
- Sample contextual title such as `ALL`.
- Sample product count.
- Desktop preview.
- Mobile preview.

### Save UX

- Show image optimization progress.
- Disable Save while uploading.
- Show validation errors inline.
- Keep unsaved values after a failed request.
- Show success notification after Firestore save.
- Ask for confirmation before removing/resetting the image.

---

## 13. Shop Page Component Refactor

Current file:

```text
app/shop/page.tsx
```

This file is already large. Avoid adding all new logic directly into it.

Recommended extra components:

```text
components/shop/ShopBanner.tsx
components/shop/PriceRangeFilter.tsx
components/shop/ColorFilter.tsx
components/ui/ColorSwatch.tsx
```

Recommended helpers:

```text
lib/shop-filters.ts
```

Possible exports:

```ts
getEffectiveProductPrice(product)
getProductPriceBounds(products)
getDynamicPriceStep(min, max)
productMatchesColor(product, selectedColorId, colors)
```

Benefits:

- Prevents duplicated desktop/mobile filter logic.
- Makes range calculations testable.
- Ensures filter and product card swatches use identical rendering.
- Reduces regressions in the existing 1,000+ line Shop component.

---

## 14. Desktop and Mobile Parity

The same behavior must work in both filter interfaces.

### Desktop

- Dynamic color circles.
- Dynamic PKR range.
- Current selected maximum.
- Reset behavior.

### Mobile filter sheet

- Use the same active color list.
- Use the same `ColorSwatch` component.
- Use the same selected color ID.
- Use the same price bounds and selected maximum.
- Do not maintain separate mobile price state.

Desktop and mobile must share state; opening the mobile filter should display the same selected values.

---

## 15. Data Compatibility and Migration

### Products

New product records should use:

```ts
colorIds: string[]
```

Legacy products may still contain:

```ts
colors: string[]
```

Migration strategy:

1. Load active Colors-module records.
2. Build a case-insensitive map from color name/slug to color ID.
3. For rendering, use `colorIds` first.
4. Resolve legacy names when `colorIds` is missing.
5. Optionally add a protected migration route later to permanently populate missing `colorIds`.

No product should disappear from Shop only because it has a legacy color name.

### Existing prices

No price conversion should be performed automatically.

Important assumption:

- Existing numeric prices are already intended to be Pakistani Rupee amounts.
- The implementation changes formatting from `$27.00` to `PKR 27`, but this will reveal unrealistic legacy numbers.
- Admin must update product amounts to real values such as `1000`, `2500`, or `10000` if the current database contains dollar-like demo values.

Do not multiply stored prices by an exchange rate unless the user explicitly requests a one-time migration.

---

## 16. Validation Rules

### Currency values

- Price must be finite.
- Price must be greater than zero for range calculation.
- Display invalid/missing price safely as `PKR 0` only where unavoidable.
- Prefer excluding invalid products from price-bound calculation.

### Colors

- HEX must match `#RRGGBB` after normalization.
- Optional secondary HEX must also match.
- Only active Colors-module records should render in filters.
- Color IDs must be unique.
- Unknown/deleted color IDs should be skipped without breaking the card.
- Never display raw HEX strings on the storefront.

### Banner

- Only JPEG, PNG, and WebP input.
- Stored format should be WebP.
- Maximum optimized data length: 750 KB.
- Alt text: maximum 160 characters.
- Overlay: clamp between `0.2` and `0.85`.
- Image position: strict enum.
- Unknown fields must not be written to Firestore.

---

## 17. Failure and Fallback Behavior

### Price range

- Invalid prices are ignored.
- Empty list disables the range control.
- One-price list renders a disabled range.

### Colors

- Colors API failure should not crash Shop.
- Product cards may omit swatches if no valid color metadata is available.
- Color filter should hide if no active usable colors exist.
- Never fall back to misleading hardcoded color circles.

### Banner

- Missing settings → default settings.
- Missing image → static brand logo.
- Invalid image → static brand logo.
- Settings/API error → static brand logo and current overlay.

### Currency

- Formatting helper must never throw during rendering.
- Invalid values should safely format as zero or be omitted according to context.

---

## 18. Suggested File Changes

### New files

```text
lib/shop-page-settings.ts
lib/server/shop-page-settings.ts
lib/shop-filters.ts
components/shop/ShopBanner.tsx
components/shop/PriceRangeFilter.tsx
components/shop/ColorFilter.tsx
components/ui/ColorSwatch.tsx
app/api/shop-page-settings/route.ts
app/api/shop-banner-image/route.ts
app/api/admin/shop-page-settings/route.ts
```

### Existing files to update

```text
app/shop/page.tsx
components/admin/StorefrontContentModule.tsx
lib/utils.ts
types/commerce.ts
```

### Optional migration/test files

```text
app/api/admin/products/migrate-colors/route.ts
lib/shop-filters.test.ts
components/ui/ColorSwatch.test.tsx
e2e/shop-filters.spec.ts
```

---

## 19. Implementation Phases

### Phase 1 — Shared utilities

- Add PKR formatter.
- Add effective-price helper.
- Add price-bounds helper.
- Add dynamic slider-step helper.
- Add reusable ColorSwatch.

Completion criteria:

- Helpers are deterministic and testable.
- Solid and dual-color circles render correctly.
- No raw HEX is printed.

### Phase 2 — Dynamic Shop filters

- Fetch active Colors-module data.
- Replace hardcoded color map.
- Use color IDs in filter state.
- Add legacy-name fallback.
- Split non-price filtering from price filtering.
- Calculate dynamic min/max.
- Update desktop and mobile filters.

Completion criteria:

- Price range reflects current products.
- Colors match Admin records.
- Desktop and mobile share filter state.

### Phase 3 — PKR formatting

- Replace all Shop dollar output.
- Update product cards.
- Update campaign prices.
- Update discount prices.
- Update Quick Add.
- Update price range labels.

Completion criteria:

- No `$` remains in Shop UI.
- Values display as `PKR 1,000` style.

### Phase 4 — Dynamic banner

- Add banner types/defaults.
- Add public settings/image APIs.
- Add protected Admin update API.
- Add Shop Page section to Storefront Content Admin.
- Add image optimization and preview.
- Replace static banner image with managed URL and fallback.

Completion criteria:

- Admin can upload and replace the banner.
- Shop updates after save/cache invalidation.
- Banner failure uses fallback image.

### Phase 5 — Verification

- Run type checking.
- Run production build.
- Test browser console.
- Test desktop and mobile.
- Test filter combinations.
- Test Firestore failure behavior.

---

## 20. Testing Checklist

### PKR

- Normal price shows `PKR`.
- Discount price shows `PKR`.
- Struck-through price shows `PKR`.
- Campaign price shows `PKR`.
- Quick Add shows `PKR`.
- Thousands separators are correct.
- No `$` remains on `/shop`.

### Price range

- Cheapest product determines minimum.
- Most expensive product determines maximum.
- Discounted effective prices are used.
- Campaign subset recalculates bounds.
- Category change recalculates bounds.
- Search recalculates bounds.
- Collection selection recalculates bounds.
- Slider excludes products above selected maximum.
- Slider maximum does not collapse because of its own filter.
- Clear Filters resets to current dynamic maximum.
- Empty results do not cause invalid range attributes.
- Single-price result disables slider safely.

### Colors

- Admin active colors appear.
- Inactive colors do not appear.
- Unused colors do not appear in the Shop filter.
- Admin order is preserved.
- Solid HEX renders correctly.
- Dual HEX renders as a split circle.
- White has a visible border.
- No HEX text appears.
- Color filter matches products by ID.
- Legacy product color names still resolve.
- Product-card circles use dynamic colors.
- Quick Add uses dynamic colors.
- Deleted color IDs do not crash Shop.

### Banner

- Default fallback renders before seeding.
- Admin uploads JPEG/PNG/WebP successfully.
- Image is optimized to WebP.
- Oversized image is rejected.
- Preview matches live Shop banner.
- Overlay opacity updates.
- Image position updates.
- Alt text updates.
- Save invalidates Shop cache.
- Firebase failure shows fallback logo.
- Contextual banner title remains correct for All, category, search, and campaign views.

### Responsive/browser

- Desktop layout remains correct.
- Mobile filters use the same colors/range.
- No hydration mismatch.
- No React console errors.
- No Next.js error overlay.
- Production build passes.

---

## 21. Acceptance Criteria

The work is complete when:

1. `/shop` shows PKR instead of dollars everywhere.
2. Prices use readable formatting such as `PKR 1,000`.
3. The price slider minimum comes from the cheapest relevant product.
4. The price slider maximum comes from the most expensive relevant product.
5. Range calculation uses effective discounted/campaign prices.
6. Range updates correctly when product context changes.
7. Shop colors come from the existing Admin Colors module.
8. Storefront shows only color circles, never HEX values.
9. Solid and dual colors are supported.
10. Product cards, filters, and Quick Add use the same color source.
11. Admin can upload and replace the Shop banner image.
12. Shop banner retains contextual heading/product-count behavior.
13. Missing Firebase data does not break the Shop page.
14. Desktop and mobile behavior match.
15. Type checking, build, and browser verification pass.

---

## 22. Final Architecture

```text
Products API / Products Context
             |
             v
   non-price product filters
             |
             +------> min/max effective price -----> PKR price slider
             |
             v
       selected max filter
             |
             v
      sorted product cards

Admin Colors Module
        |
        v
   /api/colors
        |
        v
 active/used color records
     /             \
    v               v
Color Filter    Product/Quick Add Swatches

Admin Storefront Content → Shop Page
        |
        v
/api/admin/shop-page-settings
        |
        +----> shop-page-settings/banner
        |
        +----> shop-page-images/banner
                         |
                         v
              /api/shop-banner-image
                         |
                         v
                  ShopBanner component
```

This design uses real catalog data for pricing, keeps Pakistani currency consistent, reuses the existing Colors module as the single source of truth, and allows the Shop banner to be updated without code changes.
