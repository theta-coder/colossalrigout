# Colossal Rigout — Complete Dynamic Commerce Architecture Plan

## 1. Objective

Current static/demo product system ko database-driven commerce system mein convert karna hai. Final system mein:

- Product price aur discount price dynamic hon.
- Product ki main aur secondary images local file upload se manage hon.
- Product image URL inputs aur URL-based dummy products completely remove hon.
- Colors reusable Admin module se manage hon.
- Sizes aur size guides reusable Admin module se manage hon.
- Har color + size combination ka independent stock ho.
- Collections reusable module hon aur homepage Explore Collections se linked hon.
- Rating simulator, reviews counter aur units-sold simulator remove hon.
- Customers real reviews submit karein; Admin approval ke baad public hon.
- Rating, review count aur sold units real database records se calculate hon.
- Orders aur inventory atomic/transaction-safe hon.
- Missing product image ki jagah project logo automatically show ho.

## 2. Existing Project Audit

### Current stack

- Next.js App Router + TypeScript
- Firebase Firestore
- Firebase Auth
- Firebase Storage configured hai lekin current bucket `404 / storage/unknown` return karta hai
- Cart client `localStorage` mein persist hota hai
- Orders Firestore `orders` collection mein save hote hain

### Current static/demo problems

- `lib/products.ts` mein URL-based large dummy product catalog hai.
- `Product` model flat fields use karta hai:
  - `img`
  - `images[]`
  - `colors[]`
  - `sizes[]`
  - `rating`
  - `reviews`
  - `sold`
  - free-text `collections[]`
- `ProductsContext` Firestore/API fail hone par static catalog fallback use karta hai.
- Product reset action dummy catalog dobara seed karta hai.
- Admin Product form main/secondary images ke liye URL inputs use karta hai.
- Colors hard-coded `defaultColors` aur CSS class map se aate hain.
- Sizes hard-coded `S, M, L, XL` hain.
- Product page size guide hard-coded table hai.
- Product page rating stars, review content aur sold values simulated/static hain.
- Product page “In stock” message actual inventory check nahi karta.
- Cart color/size names se identify karta hai; stable variant ID nahi hai.
- Checkout order create karte waqt inventory transaction/decrement nahi hota.
- Order tracking mein dummy orders aur dummy product URL image maujood hai.
- Collections homepage par hard-coded titles/images se banti hain.

## 3. Important Image Storage Decision

Product images ko Firestore document ke andar large Base64 strings ke taur par permanently store karna production solution nahi hoga. Is se:

- Firestore 1 MiB document limit hit ho sakti hai.
- Product list payload bohat heavy ho jayega.
- Reads aur page rendering slow hongi.
- Repeated image data database bandwidth/cost barhaye ga.

Correct production architecture:

```text
Admin selects local files
        ↓
Server validates and optimizes images
        ↓
Firebase Storage / managed object storage stores binary files
        ↓
Firestore stores image document metadata and storage path
        ↓
Product stores only ordered image IDs/references
```

Admin ko URL paste nahi karna hoga. Database mein image ka managed `storagePath` aur metadata save hoga. Current Firebase Storage bucket unavailable hai; product migration se pehle bucket provision/fix karna required hai. Temporary Base64 workaround ko product catalog par scale nahi karna.

## 4. Target Firestore Collections

### 4.1 `products`

Document ID: stable string UUID, e.g. `prod_...`

```ts
interface ProductDocument {
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Rules:

- `retailPrice > 0`
- `discountPrice` optional hai.
- Discount active ho to `0 < discountPrice < retailPrice`.
- Effective price server derive kare:

```ts
effectivePrice = discountPrice ?? retailPrice;
```

- Discount percentage UI ke liye derive ho, manually store karna required nahi:

```ts
discountPercent = Math.round((1 - discountPrice / retailPrice) * 100);
```

### 4.2 `product-images`

Har uploaded file ka separate metadata document:

```ts
interface ProductImageDocument {
  id: string;
  productId: string;
  storagePath: string;
  thumbnailPath: string;
  mediumPath: string;
  originalName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
  bytes: number;
  altText: string;
  role: 'primary' | 'gallery';
  order: number;
  createdAt: Timestamp;
}
```

All selected files main aur secondary gallery mein show hongi. Admin:

- Multiple files import karega.
- Drag/reorder karega.
- Kisi image ko primary select karega.
- Preview aur remove/replace kar sakega.
- Product delete par related files clean hongi.

Missing image behavior:

- Product renderer central `ProductImage` component use kare.
- Missing/broken `primaryImageId` par `/colossal-rigout-logo.png` render ho.
- External URL fallback bilkul use na ho.

### 4.3 `colors`

Reusable Admin Color Library:

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Admin Color module features:

- Color table/list
- Name input, e.g. `Midnight Navy`
- Native color picker: `<input type="color">`
- Manual HEX input, e.g. `#FFFFFF`, `fff`, `ffffff`
- HEX normalization automatically `#FFFFFF` format mein
- Optional second HEX for multi/dual-color swatch
- Active/inactive toggle
- Edit/delete protections
- Duplicate normalized name/HEX warning

Separate heavy color-picker library required nahi; native picker + HEX validation sufficient aur faster hai. Agar gradients/advanced palettes later required hon to `react-colorful` evaluate ki ja sakti hai.

Product form mein free-text color add nahi hoga. Active reusable colors multi-select/dropdown se assign honge.

### 4.4 `sizes`

Reusable Size Library:

```ts
interface SizeDocument {
  id: string;
  name: string;
  code: string;
  type: 'clothing' | 'shoe' | 'kids' | 'accessory' | 'custom';
  order: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Examples: `XS`, `S`, `M`, `L`, `XL`, `XXL`, `30`, `32`, `EU 42`, `UK 9`, `One Size`.

Admin Size module features:

- Add/edit/deactivate sizes
- Type/group filtering
- Display ordering
- Duplicate code prevention
- Product form reusable active sizes multi-select
- Used sizes hard-delete na hon; archive/deactivate hon

### 4.5 `size-guides`

Size guide ko product page se hard-code remove karna hai.

```ts
interface SizeGuideDocument {
  id: string;
  name: string;
  categoryIds: string[];
  unit: 'in' | 'cm';
  columns: Array<{
    key: string;
    label: string;
    order: number;
  }>;
  rows: Array<{
    sizeId: string;
    values: Record<string, string>;
    order: number;
  }>;
  instructions: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

This flexible schema clothing ke Chest/Waist/Length aur shoes ke Foot Length/UK/EU columns support karega.

Admin Sizes area ke andar:

- `Sizes` tab
- `Size Guides` tab
- Dynamic columns
- Size rows selector
- Inches/cm unit
- Measurement instructions
- Category association
- Product form mein `sizeGuideId` dropdown

Product page modal selected product ke `sizeGuideId` se table render karega.

### 4.6 `product-variants`

Stock mixing rokne ke liye inventory color aur size ke combination par hogi:

```ts
interface ProductVariantDocument {
  id: string;
  productId: string;
  colorId: string;
  sizeId: string;
  sku: string;
  barcode?: string | null;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Stable variant ID recommended:

```text
{productId}_{colorId}_{sizeId}
```

Formula:

```ts
availableStock = stockOnHand - reservedStock;
```

Example:

| Product | Color | Size | SKU | Stock |
|---|---|---|---|---:|
| Cotton Shirt | Black | M | CS-BLK-M | 12 |
| Cotton Shirt | Black | L | CS-BLK-L | 4 |
| Cotton Shirt | White | M | CS-WHT-M | 9 |

Product form color aur size select karne ke baad variant matrix automatically generate karega. Admin har row ka SKU, stock aur reorder level separately enter karega.

### 4.7 `collections`

Free-text Collection Association Tags replace honge:

```ts
interface CollectionDocument {
  id: string;
  name: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  imageId: string | null;
  active: boolean;
  featuredOnHome: boolean;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Admin `Collections` module:

- Create/edit/archive collection
- Local cover-image upload
- Homepage title/subtitle/order
- Explore Collection visibility
- Product count
- Product form dropdown/multi-select

Homepage Explore Collections same collection documents use karega. Product association IDs se hogi, manually repeated names se nahi.

Automatic collection link:

```text
/shop?collection={slug}
```

Manual destination URL field nahi hoga.

### 4.8 `reviews`

```ts
interface ReviewDocument {
  id: string;
  productId: string;
  userId: string | null;
  orderId: string | null;
  variantId?: string | null;
  customerName: string;
  customerEmail: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  verifiedPurchase: boolean;
  adminNote?: string;
  createdAt: Timestamp;
  moderatedAt?: Timestamp | null;
  moderatedBy?: string | null;
}
```

Customer flow:

1. Product page par review form.
2. Rating + title + body validation.
3. Review `pending` status mein save.
4. Public website par pending review show nahi hogi.
5. Admin Reviews module approve/reject karega.
6. Approval transaction product aggregate update karegi.

Admin Reviews module:

- Pending/approved/rejected filters
- Product/customer/date/rating search
- Review detail
- Approve/reject/bulk moderation
- Verified purchase badge
- Abuse/spam controls

Product rating fields manually editable nahi honge:

```ts
aggregateRating = approved ratings sum / approvedReviewCount
```

Only approved reviews product page par show hongi.

### 4.9 `inventory-transactions`

Inventory audit ledger:

```ts
interface InventoryTransactionDocument {
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
  createdAt: Timestamp;
}
```

Direct stock overwrite avoid hoga. Har adjustment ledger entry create karega.

### 4.10 `orders` and order item snapshots

Existing `orders` collection retain ki ja sakti hai, lekin items stable variant snapshots use karein:

```ts
interface OrderItemSnapshot {
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;
  primaryImagePath: string | null;
  retailPrice: number;
  discountPrice: number | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}
```

Order historical snapshot rakhega taa-ke future product edits purane invoice ko change na karein.

### 4.11 Optional supporting collections

- `inventory-reservations`: payment/checkout reservation expiry
- `product-aggregates`: high-scale analytics if required
- `site-assets`: shared default logo/image references
- `admin-audit-logs`: pricing, stock, moderation and deletion audit

## 5. Product Image Upload Requirements

### Admin UI

- `Primary Thumbnail Image URL` remove.
- `Secondary Details Image URL` input and `Add URL` button remove.
- One multi-file dropzone/file selector add.
- Accepted: JPG, PNG, WebP.
- Max original file size configurable, recommended 10 MB each.
- Image preview, reorder, primary selection and removal.
- All imported images product gallery mein show hon.

### Server processing

- MIME + file signature validation.
- Unique generated filenames.
- EXIF orientation handling.
- WebP/AVIF optimization.
- Thumbnail, medium and full variants.
- Suggested dimensions:
  - thumbnail: 320px
  - card: 720px
  - product detail: 1400px
- Upload succeeds before Product image reference commit.
- Failed product save par orphan upload cleanup.
- Product/image delete par object cleanup.

### No URL policy

- Product API `http://` or `https://` image fields reject kare.
- `img` and `images[]` legacy URL fields target schema mein nahi honge.
- Dummy remote images and related Next.js remote patterns migration ke baad remove hon.
- Product/order/wishlist/cart components managed image resolver use karein.

## 6. Discount Price Frontend Behavior

When discount exists:

- Discount price prominent show ho.
- Retail price line-through show ho.
- Derived percentage badge show ho.
- Cart/order `unitPrice` effective price capture kare.
- Promo discount effective subtotal par apply ho.
- Server checkout price dobara verify kare; client price trust na kare.

When no discount:

- Only retail price show ho.

## 7. Cart and Checkout Inventory Rules

Cart item identity:

```text
variantId, not productId + free-text color + free-text size
```

Add-to-cart:

- Selected color/size se exact variant resolve ho.
- `availableStock <= 0` ho to Add to Cart disabled.
- Quantity maximum available stock se exceed na kare.

Checkout Firestore transaction:

1. All selected variant documents read.
2. Current prices re-read.
3. Stock quantities validate.
4. Inventory decrement/reservation atomically write.
5. Inventory transaction documents create.
6. Order create.
7. Failure par complete transaction rollback.

Order cancellation/return:

- Stock restoration transaction.
- Inventory ledger entry.
- Duplicate restoration prevention.

Sold units:

- Manual `sold` field remove.
- Completed/valid order quantities se increment.
- Cancelled/refunded items correctly reverse hon.

## 8. Required Admin Navigation Modules

Final Admin sidebar:

1. Dashboard Overview
2. Products
3. Add/Edit Product
4. Inventory
5. Colors
6. Sizes & Size Guides
7. Collections
8. Reviews
9. Orders
10. Promo Codes
11. Hero Slides
12. Shop Categories

### Inventory module UI

- Total stock, low stock, out-of-stock stats
- Product/SKU/color/size search
- Variant stock table
- Stock adjustment modal
- Reorder-level warnings
- Transaction history
- CSV import/export optional later

## 9. Product Form Target Layout

### Basic information

- Name
- Slug auto-generated
- Dynamic category
- Description
- Status

### Pricing

- Retail price
- Discount price optional
- Computed effective price/discount preview
- Currency

### Images

- Multi-file import
- Primary selection
- Ordered secondary gallery
- Logo fallback preview

### Colors and sizes

- Dynamic active colors multi-select
- Dynamic active sizes multi-select
- Size guide dropdown
- Generated color × size variant matrix
- Per-variant SKU and stock

### Collections

- Dynamic collections multi-select
- No free-text tags

### Removed controls

- Main Image URL
- Secondary Image URL
- Static color buttons
- Static size buttons
- Rating simulator
- Reviews counter
- Units sold counter
- Simulated bestseller wording

## 10. API Plan

### Products

- `GET /api/products`
- `GET /api/products/{id-or-slug}`
- `POST /api/products`
- `PUT /api/products/{id}`
- `DELETE /api/products/{id}` or archive preferred
- `POST /api/products/{id}/images`
- `DELETE /api/products/{id}/images/{imageId}`
- `PUT /api/products/{id}/images/reorder`

### Colors

- CRUD `/api/colors`
- Delete blocked if actively referenced; archive offered

### Sizes and guides

- CRUD `/api/sizes`
- CRUD `/api/size-guides`

### Collections

- CRUD `/api/collections`
- `/api/collections/{slug}/products`

### Reviews

- Public `POST /api/reviews`
- Public approved `GET /api/reviews?productId=...&status=approved`
- Admin moderation `PUT /api/admin/reviews/{id}`

### Inventory

- `GET /api/inventory`
- `POST /api/inventory/adjust`
- `GET /api/inventory/transactions`

### Checkout

- `POST /api/checkout` server transaction
- Client-side direct order writes remove

All mutation APIs server-side validation and admin authorization enforce karein.

## 11. Frontend Changes

### Homepage

- New Arrivals database timestamps/status se.
- Best Sellers real sold units/approved performance se.
- Explore Collections dynamic `collections` documents se.
- Cards effective price and discount display karein.
- Images centralized managed resolver use karein.

### Shop

- Dynamic categories and collections filters.
- Color and size filters reusable libraries se.
- In-stock/discount filters.
- URL query generated slugs se.

### Product page

- Database image gallery.
- Dynamic color/size variants.
- Exact variant availability.
- Dynamic size guide.
- Real approved reviews.
- Review submission form.
- Effective price/discount.
- Real sold count and aggregate rating.
- Static review prose, size table and “In stock” text remove.

### Cart/wishlist/orders

- Stable string product/variant IDs.
- Managed image paths.
- Effective price snapshots.
- No dummy URL images.
- No deterministic dummy order tracking.

## 12. Dummy and Static Data Removal Scope

Following cleanup required hai:

- Delete static `catalog` entries from `lib/products.ts` after migration.
- Remove ProductsContext catalog fallback.
- Remove/reset dummy product seeding.
- Remove all product Unsplash/Picsum URLs.
- Remove dummy order tracking records and fallback matching.
- Remove hard-coded color class/name lists.
- Remove hard-coded sizes.
- Remove hard-coded size guide table.
- Remove hard-coded product reviews.
- Remove rating/review/sold fallbacks such as `4.8`, `150+ sold`.
- Remove hard-coded collection list and fallback collection images.
- Remove URL fields/buttons/placeholders from Product Admin.
- Remove product remote-image config patterns only after all non-product features are audited/migrated.

Do not delete dummy data until real product records and assets are migrated and verified.

## 13. Migration Plan

### Phase 0 — Backup and baseline

- Firestore export/backup.
- Existing products/orders snapshot.
- Current build/typecheck baseline.
- Identify real vs dummy product records.

### Phase 1 — Storage and shared schemas

- Provision/fix Firebase Storage bucket.
- Storage and Firestore security rules.
- Shared TypeScript schemas and validators.
- Central image resolver + logo fallback.

Exit: file upload/read/delete verified without external URL.

### Phase 2 — Colors module

- `colors` collection/API/Admin module.
- Native picker + HEX/name validation.
- Existing color names migration.

Exit: reusable active colors product form mein available.

### Phase 3 — Sizes and size guides

- `sizes` and `size-guides` collections/APIs/Admin.
- Existing S/M/L/XL migration.
- Dynamic product page modal.

Exit: no static sizes/guide remains.

### Phase 4 — Collections module

- Collection CRUD + image upload.
- Homepage Explore Collections dynamic integration.
- Existing product text tags map to collection IDs.

Exit: no repeated free-text collection tags.

### Phase 5 — New product schema and images

- Product model/API update.
- Discount price.
- Multi-file image upload.
- Image order/primary selection.
- Legacy product migration mapping.

Exit: new product can be created without any image URL.

### Phase 6 — Variants and inventory

- Variant matrix.
- Inventory module and ledger.
- Cart variant IDs.
- Stock-aware product UI.

Exit: every color/size stock independent and auditable.

### Phase 7 — Transactional checkout

- Server-side checkout endpoint.
- Atomic stock validation/decrement/order write.
- Cancellation/return restoration.

Exit: overselling and mixed stock prevented.

### Phase 8 — Reviews

- Submission, moderation and approved listing.
- Rating aggregate transaction.
- Static/simulated review metadata removal.

Exit: only approved real reviews public.

### Phase 9 — Static/dummy cleanup

- Remove dummy catalog and URLs.
- Remove all simulator fields/fallbacks.
- Remove dummy orders and collection data.
- Disable/remove reset seeding.

Exit: database and managed assets are the only commerce source.

### Phase 10 — QA and deployment

- Full regression test.
- Firestore indexes/rules deployment.
- Performance and payload review.
- Production build.
- Migration reconciliation report.

## 14. Security Rules Strategy

Current `firestore.rules` allows global read/write and production ke liye unsafe hai.

Target:

- Public read only active products/categories/collections, approved reviews and required assets.
- Customer can create own pending review with restricted fields.
- Customer cannot approve reviews or alter aggregate rating.
- Inventory/pricing/product mutations admin-only.
- Checkout only trusted server transaction.
- Order reads owner/admin limited; guest tracking secure token/validated details se.
- Storage upload/delete admin-only.
- Public managed product image read.

## 15. Firestore Indexes Likely Required

- Products: `status + categorySlug + createdAt`
- Products: `status + collectionIds(array-contains) + createdAt`
- Products: `status + soldUnits`
- Variants: `productId + active`
- Variants: `availableStock + active`
- Reviews: `productId + status + createdAt`
- Reviews: `status + createdAt`
- Inventory transactions: `variantId + createdAt`
- Orders: `ownerId + createdAt`

Final indexes actual queries implement hone ke baad generate/deploy hon.

## 16. Performance Requirements

- Product list API full Base64/image binary return na kare.
- Thumbnail variant cards par use ho.
- Full image sirf product detail par.
- Pagination/cursor-based product/review/inventory tables.
- Product summaries denormalize where useful.
- Avoid N+1 Firestore reads.
- Images lazy-load except primary above-fold image.
- API caching/revalidation with admin mutation invalidation.
- Firestore transaction batches within platform limits.

## 17. Acceptance Criteria

- Product Admin mein image URL field nahi.
- All product images local file import se.
- Main and all secondary images database-referenced and storefront gallery mein visible.
- Missing image uses Colossal Rigout logo.
- Dummy product URLs project commerce flow se removed.
- Retail and discount prices validate/render correctly.
- Colors reusable Admin module se; name/HEX/native picker supported.
- Sizes and size guides reusable dynamic modules se.
- Product form dynamic colors/sizes/collections use kare.
- Color × size variant stock separate ho.
- Inventory adjustments auditable hon.
- Checkout oversell na kare and stock atomically update ho.
- Rating simulator/review counter/sold counter removed.
- Customer review pending state mein submit ho.
- Only Admin-approved reviews public hon.
- Aggregate rating and sold count real records se.
- Explore Collections dynamic module se connected ho.
- Static size guide/reviews/collections/dummy orders removed.
- Firestore/Storage rules production-safe hon.
- TypeScript, lint, tests and production build pass karein.

## 18. Recommended Execution Order

Implementation ko ek giant edit mein perform na karein. Dependency-safe order:

```text
Storage → shared types → Colors → Sizes/Guides → Collections
→ Product schema/images → Variants/Inventory → Checkout
→ Reviews → Dummy cleanup → Security/QA
```

## 19. Scope Status

- [x] Existing project architecture audited
- [x] Target collections/documents designed
- [x] Dependency order defined
- [ ] Storage bucket provisioned
- [ ] Colors module implemented
- [ ] Sizes/size guides implemented
- [ ] Collections module implemented
- [ ] Product schema/images/discount implemented
- [ ] Variants/inventory implemented
- [ ] Transactional checkout implemented
- [ ] Reviews/moderation implemented
- [ ] Static/dummy data removed
- [ ] Security and production QA completed

This document is an implementation plan only. Is step mein requested commerce modules, database records or existing product data modify nahi kiye gaye.
