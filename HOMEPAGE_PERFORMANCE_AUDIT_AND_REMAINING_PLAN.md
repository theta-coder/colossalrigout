# Homepage Performance — Fresh Audit and Remaining Plan

Audit date: **21 July 2026**  
Route: `/`  
Project: Next.js **15.5.20**, React **19.2.7**

## 1. Final Audit Result

Homepage performance optimization ka major implementation complete ho chuka hai, lekin project ko abhi **100% production-complete** mark nahi karna chahiye.

Current estimate:

- Architecture and progressive rendering: **complete**
- Broken/missing image fallback: **complete in code**
- Server data caching and ISR foundation: **complete**
- Admin cache invalidation: **partial**
- Firestore query/read optimization: **partial**
- Permanent image-storage optimization: **missing**
- Production Lighthouse and end-to-end proof: **missing**

## 2. What Is Implemented Now

### 2.1 Server Rendering and Streaming

- [x] `app/page.tsx` is a Server Component.
- [x] Old 900+ line client homepage has been split into focused sections.
- [x] Hero, Categories, New Arrivals, Promo, Best Sellers, Campaign Cards, Collections, Reviews and Trust Benefits have independent Suspense boundaries.
- [x] `app/loading.tsx` provides the route-level skeleton.
- [x] Section-specific skeletons exist.
- [x] A slow below-the-fold dataset no longer needs to block the complete homepage.
- [x] Newsletter and interactive carousels are isolated as Client Components.

### 2.2 Image Fallback Requirement

- [x] Shared `components/ui/ImageWithFallback.tsx` exists.
- [x] Empty image source uses `/product-placeholder.png`.
- [x] Runtime image failure switches to `/product-placeholder.png` through `onError`.
- [x] Fallback loop prevention exists through `hasError` and source comparison.
- [x] Hero uses the shared fallback component.
- [x] Promo Campaign uses the shared fallback component.
- [x] Campaign Cards use the shared fallback component.
- [x] Product Cards use the shared fallback component.
- [x] Categories use the shared fallback component.
- [x] Collections use the shared fallback component.
- [x] The homepage image proxy redirects missing, invalid or unsupported images to `/product-placeholder.png`.
- [x] `public/product-placeholder.png` exists.

Therefore the requested default-product-image behavior is **implemented in the current code**.

### 2.3 Image Loading Improvements

- [x] Homepage no longer intentionally serializes Firestore base64 images into component props.
- [x] Images are served through `/api/homepage-image/[kind]/[id]`.
- [x] Proxy responses include browser cache headers.
- [x] First Hero image alone gets priority/high fetch priority.
- [x] Hero has `sizes="100vw"`.
- [x] Product, Campaign Card, Category and Collection images have responsive `sizes`.
- [x] Promo background uses Next Image instead of a raw `<img>`.

### 2.4 Server Data and Cache Foundation

- [x] `lib/server/homepage.ts` no longer imports the Firebase browser SDK.
- [x] Homepage data uses a stateless Firestore REST helper.
- [x] REST fetches support Next.js revalidation and cache tags.
- [x] Homepage has `revalidate = 3600`.
- [x] Dataset-specific tags such as `homepage:hero`, `homepage:products` and `homepage:reviews` exist.
- [x] React `cache()` deduplicates the product read used by New Arrivals and Best Sellers during a render.
- [x] Campaign Cards avoid an immediate duplicate browser fetch when server data is supplied.
- [x] Review product-existence N+1 reads are no longer part of the homepage helper.

### 2.5 Bundle and Runtime Work

- [x] Quick Add modal is dynamically imported.
- [x] Hero and Product carousel timers pause while the browser tab is hidden.
- [x] Reduced-motion CSS disables skeleton pulse animation.
- [x] The old global browser loading gate has been removed.
- [x] Current TypeScript check passes.
- [x] Targeted homepage ESLint check passes.

## 3. What Is Still Partial

### 3.1 Admin Cache Invalidation Coverage

Invalidation currently exists for:

- Hero mutations
- Product mutations
- Promo Campaign mutations
- Review moderation mutation

Invalidation is still not present in every homepage-related mutation route. The missing/uncertain coverage includes:

- Shop Categories
- Campaign Cards and their reorder action
- Collections
- Trust Benefits
- Colors
- Sizes
- Promotions and Stores when their data changes Campaign Card output
- Review creation/deletion paths other than the audited moderation route

Risk: cached homepage content may remain stale for up to the one-hour ISR interval after these admin changes.

### 3.2 Firestore Query Efficiency

`fetchFirestoreRestCollection` supports `whereEquals`, `orderBy`, and `limit`, but homepage helpers mostly do not use them yet.

Current behavior still includes:

- Reading up to 100 documents from a collection.
- Filtering active/status records in application code.
- Sorting in application code.
- Slicing Products and Reviews after fetching.
- Fetching complete Products, Colors and Sizes collections for homepage cards.
- Fetching complete Promotions and Stores collections to render Campaign Cards.

The query helper also falls back to a full collection GET when a structured query fails. That fallback returns unfiltered documents unless each caller applies equivalent local filtering.

### 3.3 Error and Empty States

- Data helpers safely return empty arrays/null on failure.
- Some optional sections correctly disappear when empty.
- Visible retry/error states are not consistently available.
- There is no homepage-specific `app/error.tsx` boundary for a complete unexpected route error.

### 3.4 Carousel Runtime Efficiency

- Visibility handling is implemented for the browser tab.
- Off-screen detection through Intersection Observer is not consistently implemented.
- Product and Campaign Card carousels still use resize listeners and JavaScript slide counts.
- Campaign Cards, Reviews and other below-the-fold interactive code can still hydrate before entering the viewport.

### 3.5 Image Proxy Architecture

- The proxy prevents base64 payloads from entering homepage HTML/RSC.
- The proxy route itself still imports `firebase/firestore`, which is the browser-oriented SDK.
- Base64 images still live inside Firestore documents.
- A 302 placeholder redirect works but creates an extra request for missing images.
- The placeholder file is approximately 611 KB, which is larger than ideal for a universal fallback asset.

## 4. What Is Completely Missing

- [ ] Firebase Storage/Cloud Storage migration for uploaded homepage and product images.
- [ ] WebP/AVIF generation and upload-time resizing.
- [ ] A small optimized placeholder asset.
- [ ] Server-side bounded Firestore queries used by every homepage helper.
- [ ] Complete cache invalidation coverage for every related admin mutation.
- [ ] Below-the-fold viewport-based hydration/loading based on measured bundle cost.
- [ ] Homepage-specific unexpected-error UI if desired.
- [ ] Production Lighthouse mobile report.
- [ ] Production Lighthouse desktop report.
- [ ] Recorded LCP, CLS, INP, TTFB, request count and transferred-byte comparison.
- [ ] Final browser verification of intentionally missing Hero/Card/Product images.
- [ ] Final clean production `next start` smoke test.

## 5. Important Production Verification Note

During the previous verification attempt, two Next dev processes were writing to the same `.next` directory while a production build/start was being tested. This mixed development and production chunks and produced misleading missing vendor-chunk errors.

At the time of this fresh audit, one dev server is still running for this workspace. A production build should not be run against the same `.next` directory until that dev process is stopped.

This is an environment/process issue, not a TypeScript or ESLint failure in the audited homepage source.

## 6. Remaining Implementation Plan

### Phase 1 — Complete Cache Invalidation

Add focused invalidation to every relevant create/update/delete/reorder mutation:

| Mutation area | Required tags |
|---|---|
| Categories | `homepage`, `homepage:categories` |
| Campaign Cards | `homepage`, `homepage:campaign-cards` |
| Collections | `homepage`, `homepage:collections` |
| Trust Benefits | `homepage`, `homepage:trust-benefits` |
| Colors | `homepage`, `homepage:colors`, `homepage:products` |
| Sizes | `homepage`, `homepage:sizes`, `homepage:products` |
| Promotions | `homepage`, `homepage:promotions`, `homepage:campaign-cards` |
| Stores | `homepage`, `homepage:stores`, `homepage:campaign-cards` |
| Reviews | `homepage`, `homepage:reviews` |

Also call `revalidatePath('/')` where required by the current Next.js 15 strategy.

Acceptance criteria:

- Every relevant admin mutation updates the homepage without waiting one hour.
- Unrelated cached datasets are not unnecessarily invalidated.

### Phase 2 — Use Bounded Server Queries

1. Use `whereEquals` for active/status/featured records where the schema supports it.
2. Use `orderBy` for Hero, Categories, Campaign Cards, Collections and Trust Benefits.
3. Use `limit` for Hero, Products, Reviews and other homepage-only lists.
4. Define a reliable New Arrivals timestamp/order field rather than reversing an arbitrary collection response.
5. Define a reliable Best Sellers field/ranking strategy.
6. Avoid reading all Promotions and Stores merely to render a few active Campaign Cards; fetch referenced records or denormalize safe display values.
7. Preserve equivalent filtering if the REST structured query falls back.
8. Document/create the required Firestore indexes.

Acceptance criteria:

- Read count is bounded for every homepage request/revalidation.
- New Arrivals ordering is deterministic.
- Only approved latest reviews are returned by the server query.
- Query failure never causes inactive content to appear.

### Phase 3 — Harden the Image Path

Short-term:

1. Keep `ImageWithFallback` coverage.
2. Add tests for empty URL, proxy 404/redirect, invalid base64 and network failure.
3. Replace the 611 KB placeholder with a visually equivalent optimized WebP/PNG.
4. Consider returning the fallback image from the proxy without a second request.
5. Move proxy Firestore access to the same server-native data approach.

Long-term:

1. Upload images to Firebase Storage or equivalent object storage.
2. Store only URL/path and metadata in Firestore.
3. Generate desktop/mobile Hero variants and card thumbnails.
4. Generate WebP/AVIF versions.
5. Migrate legacy base64 records without breaking existing content.
6. Retire the Firestore base64 proxy after migration.

### Phase 4 — Measured Client Runtime Reduction

1. Measure the client bundle and hydration cost first.
2. Pause autoplay when a carousel is outside the viewport.
3. Lazy-load below-the-fold carousel behavior only if measurements show meaningful savings.
4. Prefer CSS responsive layouts over JavaScript resize state where possible.
5. Preserve server-rendered content for SEO and accessibility.

### Phase 5 — Production Verification

1. Stop all Next processes for this workspace.
2. Move the generated `.next` cache aside.
3. Run `npx tsc --noEmit`.
4. Run targeted ESLint.
5. Run one clean `npm run build`.
6. Start one production server on a separate port.
7. Verify `/`, placeholder and representative image-proxy URLs return HTTP 200.
8. Test Hero, Campaign Card and Product records with missing images.
9. Check browser console and network errors.
10. Run Lighthouse mobile and desktop and save the metrics.

## 7. Recommended Execution Order

```text
1. Complete admin cache invalidation
2. Apply bounded Firestore queries and deterministic ordering
3. Harden/optimize the placeholder and image proxy
4. Perform clean production smoke test
5. Record Lighthouse baseline
6. Apply measured below-the-fold improvements
7. Migrate images to object storage
8. Run final Lighthouse and regression comparison
```

## 8. Verification Performed in This Audit

- `npx tsc --noEmit`: **passed**
- Targeted ESLint for homepage, server helpers, image fallback and proxy: **passed**
- Current code and route search: **completed**
- Production build/start: **not run**, because an active dev server is using the same `.next` directory
- Lighthouse: **not run**

## 9. Current Decision

The broken/missing image fallback requirement is implemented in code. The homepage performance refactor is also largely implemented.

Remaining priority work is cache-invalidation coverage, bounded Firestore queries, image-storage optimization and clean production performance verification. Do not mark the complete optimization initiative as finished until those items and the final production quality gate pass.
