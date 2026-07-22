# Homepage Performance Optimization — Complete Implementation Plan

## 1. Goal

Current `/` homepage ko visually same rakhte hue actual loading speed, perceived speed, Core Web Vitals aur mobile performance improve karni hai.

Current full-page Tailwind skeleton useful visual fallback hai, lekin skeleton khud network/database speed improve nahi karta. Recommended implementation homepage ko progressive, server-rendered and cache-aware banayegi:

```text
Current behavior:
All initial APIs complete → entire homepage appears

Recommended behavior:
Header + server-rendered Hero immediately
        ↓
Categories and product sections stream independently
        ↓
Below-fold campaigns, collections and reviews load progressively
```

## 2. Current Homepage Audit

Current `app/page.tsx`:

- Whole page is a Client Component
- Hero, categories, campaign, reviews, collections and trust benefits separate client requests use karte hain
- Products `ProductsContext` ke client request se load hote hain
- Full-page skeleton sab initial requests settle hone tak real content block karta hai
- Reviews, collections and trust benefits bhi hero ko reveal hone se rok sakte hain
- Multiple independent state/effect blocks hydration ke baad execute hote hain
- Above-the-fold hero initial HTML mein real data ke saath render nahi hota
- Product carousels viewport width JavaScript state se calculate karte hain
- Several homepage images database base64/data URLs ho sakti hain
- Below-fold carousel JavaScript initial bundle aur hydration cost increase karta hai
- Campaign and content APIs par clear browser/CDN caching policy nahi hai

## 3. Performance Targets

Production mobile targets:

- LCP: **2.5 seconds or lower**
- CLS: **0.10 or lower**
- INP: **200 ms or lower**
- TTFB: preferably **800 ms or lower**
- Initial above-the-fold content should not wait for reviews or collections
- Hero should render from initial response, not after client hydration
- No full-page loading lock after persistent header is visible
- No duplicate initial request for the same dataset

These are targets, not guaranteed values; actual results hosting, Firestore region, image weight and network conditions par depend karenge.

## 4. Recommended Architecture

### 4.1 Server Page + Small Client Islands

`app/page.tsx` ko Server Component banana recommended hai.

Interactive parts separate Client Components hon:

- `HeroCarouselClient`
- `ProductCarouselClient`
- `ReviewsCarouselClient`
- `NewsletterFormClient`
- `QuickAddController`

Static/server-renderable sections:

- Section headings
- Category list
- Initial product cards
- Campaign text
- Collections
- Trust benefits

Is approach se complete homepage JavaScript hydration ki zarurat nahi hogi.

### 4.2 Shared Server Data Layer

Firestore reads ko route handlers aur homepage dono mein reuse karne ke liye server helpers create hon:

```text
lib/server/homepage.ts
├── getActiveHeroSlides()
├── getHomepageCategories()
├── getHomepageProducts()
├── getActivePromoCampaign()
├── getHomepageCampaignCards()
├── getFeaturedCollections()
├── getLatestApprovedReviews()
└── getActiveTrustBenefits()
```

Homepage Server Component ko apni APIs ko HTTP ke through call nahi karna chahiye. Direct shared server helpers extra network hop avoid karenge.

## 5. Loading Priority Groups

### Critical Group — Initial HTML

- Hero first slide
- Main hero title/subtitle/CTA
- Header (already layout-level)
- First visible categories
- First visible New Arrivals cards

### Secondary Group — Stream After Critical Content

- Remaining hero slides
- Remaining New Arrivals products
- Best Sellers
- Active promo campaign

### Below-the-Fold Group

- Campaign cards
- Collections
- Reviews
- Trust benefits
- Newsletter interactivity

Slow reviews or collections must never delay the hero.

## 6. Section-Level Skeleton Strategy

Current `HomePageSkeleton` retain ho sakta hai as route-level fallback, but hydrated homepage mein one global `pageLoading` condition remove ki jaye.

Recommended skeleton components:

- `HeroSkeleton`
- `CategoriesSkeleton`
- `ProductRowSkeleton`
- `PromoCampaignSkeleton`
- `CampaignCardsSkeleton`
- `CollectionsSkeleton`
- `ReviewsSkeleton`
- `TrustBenefitsSkeleton`

Every skeleton:

- Final component ke same dimensions use kare
- Responsive grid count match kare
- `aria-busy` and accessible loading text provide kare
- No fake buttons as interactive controls render kare
- Content load hone par minimal CLS produce kare

## 7. Streaming and Suspense

Homepage sections ko independent Suspense boundaries mein divide karein:

```tsx
<Suspense fallback={<HeroSkeleton />}>
  <HeroSection />
</Suspense>

<Suspense fallback={<CategoriesSkeleton />}>
  <CategoriesSection />
</Suspense>

<Suspense fallback={<ProductRowSkeleton />}>
  <NewArrivalsSection />
</Suspense>
```

Hero ko unnecessary slow sections ke same boundary mein nahi rakhna chahiye.

## 8. Parallel Data Fetching

Independent critical reads parallel start hon:

```ts
const heroPromise = getActiveHeroSlides();
const categoryPromise = getHomepageCategories();
const productPromise = getHomepageProducts();
```

Sequential waterfall avoid karein. Below-fold sections apni Suspense boundaries ke andar independently resolve ho sakte hain.

## 9. Caching Strategy for Current Next.js 15

Project currently Next.js 15 use karta hai, isliye implementation Next.js 15-compatible honi chahiye.

Recommended data freshness:

| Data | Revalidation target |
|---|---:|
| Hero slides | 5 minutes or on-demand after admin save |
| Categories | 10 minutes or on-demand |
| Product cards | 1–5 minutes |
| Active promo campaign | 30–60 seconds |
| Campaign cards | 5 minutes |
| Collections | 10 minutes |
| Reviews | 5 minutes |
| Trust benefits | 10 minutes |

Options:

- Server helper memoization using Next.js 15-compatible cache utilities
- Route response `Cache-Control` where safe
- `revalidatePath('/')` or tagged revalidation after admin mutations
- Campaign end-time must remain client-calculated after cached campaign configuration loads

Admin mutation ke baad homepage cache invalidate ho taa-ke updates timely reflect hon.

## 10. Consolidated Homepage API

If full Server Component migration ek phase mein possible na ho, intermediate solution:

```text
GET /api/homepage
```

Response:

```ts
interface HomepagePayload {
  heroSlides: HeroSlide[];
  categories: ShopCategory[];
  newArrivals: Product[];
  bestSellers: Product[];
  activeCampaign: PromoCampaign | null;
  campaignCards: CampaignCard[];
  collections: Collection[];
  reviews: Review[];
  trustBenefits: TrustBenefit[];
  serverNow: string;
}
```

Server endpoint Firestore reads `Promise.allSettled()` se parallel kare. One optional dataset failure poora homepage fail na kare.

Long-term preferred option remains direct server helpers plus streaming, because consolidated API ka slowest read complete response delay kar sakta hai.

## 11. Image Optimization

### 11.1 Remove Base64 Images from Firestore Documents

Large base64/data URLs:

- Firestore documents heavy banati hain
- API JSON size increase karti hain
- Browser/CDN caching reduce karti hain
- Next Image optimization ko limit kar sakti hain

Recommended migration:

- Firebase Storage, Cloud Storage or equivalent object storage
- Store only optimized image URL/path in Firestore
- Generate WebP/AVIF variants
- Preserve legacy image fallback during migration

### 11.2 Hero Image

- First active hero image only `priority`
- Accurate `sizes="100vw"`
- Remaining slides lazy-load
- Mobile-specific hero asset optional
- Desktop recommended width around 1920px
- Mobile recommended width around 900–1200px
- Avoid oversized original uploads

### 11.3 Product and Collection Images

- Accurate responsive `sizes`
- Only first viewport product images eager/high priority if needed
- Remaining images lazy by default
- Explicit aspect ratio containers retain layout stability
- Avoid unoptimized `<img>` for campaign backgrounds where compatible

## 12. Below-the-Fold Lazy Loading

Use Intersection Observer or lightweight lazy section wrapper for:

- Promo campaign cards carousel
- Collections carousel/grid enhancements
- Reviews carousel JavaScript
- Non-critical analytics

Server-rendered placeholder/content can remain visible; heavy interaction code should load near viewport.

Avoid lazy-loading essential hero text or first hero image.

## 13. JavaScript Bundle Reduction

- Split current large `app/page.tsx`
- Keep static sections as Server Components
- Dynamically import only interactive below-fold carousels
- Do not ship admin types/helpers to the homepage bundle
- Replace JavaScript viewport-width carousel calculations with CSS responsive layout where possible
- Avoid duplicate carousel timers when tabs/background page are inactive
- Pause autoplay when carousel is outside viewport or document is hidden
- Load Quick Add modal code only after user requests it

## 14. Product Data and Context Duplication

Current `ProductsContext` fetch can duplicate server-provided homepage data.

Recommended options:

1. Homepage product cards receive server-fetched products; context remains for catalog/admin pages.
2. ProductsProvider accepts `initialProducts` so browser hydration does not immediately refetch.
3. Client cache deduplicates `/api/products` across consumers.

Option 1 is simplest for homepage performance. Cart/wishlist actions can remain client islands around individual controls.

## 15. Firestore Query Optimization

- Query only active/featured records required for homepage
- Apply limits server-side, not after reading whole collections
- Store sortable timestamps/order fields
- Add indexes required by active + order queries
- Fetch only 10 New Arrivals and 10 Best Sellers
- Fetch only latest approved reviews required for carousel
- Avoid loading full product descriptions/large gallery arrays for product cards

Create a lightweight `ProductCardData` projection where practical:

```ts
interface ProductCardData {
  id: number;
  name: string;
  slug?: string;
  image: string;
  price: number;
  retailPrice?: number;
  discountPrice?: number;
  colors: string[];
  rating?: number;
  sold?: string;
  isBestseller?: boolean;
}
```

## 16. Error and Empty-State Strategy

Each section must fail independently:

- Hero failure → branded static fallback hero
- Categories failure → section hidden or retry card; products still visible
- Campaign failure → campaign section omitted
- Reviews failure → reviews section omitted
- Collections failure → section omitted
- Product failure → compact retry/empty state without blocking remaining page

Never keep a skeleton indefinitely after a failed request.

## 17. Request Reliability

- Use `AbortController` for client requests that can outlive components
- Add reasonable timeouts to non-critical client fetches
- Prevent duplicate focus/revalidation requests
- Deduplicate active campaign refreshes
- Use `Promise.allSettled()` for independent datasets
- Log server errors without exposing sensitive Firestore details to clients

## 18. Fonts and CSS

Current `next/font` usage retain karein because it reduces font-related layout shift.

Further checks:

- Only required Poppins and Playfair weights load hon
- Critical Tailwind classes statically discoverable hon
- Repeated skeleton animation respects `prefers-reduced-motion`
- Avoid excessive backdrop blur and large shadows on low-end mobile where not visually essential

Optional CSS:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none;
  }
}
```

## 19. SEO and Initial HTML

After Server Component migration, initial HTML should contain:

- Hero heading
- Hero description
- Primary CTA links
- Category links
- Initial product names and prices

This improves crawlability and content visibility even before JavaScript hydration.

Homepage metadata and structured data can be extended separately, but performance refactor must not remove existing metadata.

## 20. Recommended Component Structure

```text
app/
├── page.tsx                         # Server Component
└── loading.tsx                      # Route-level fallback

components/home/
├── HeroSection.tsx                  # Server wrapper
├── HeroCarouselClient.tsx           # Client interaction only
├── CategorySection.tsx
├── ProductSection.tsx
├── ProductCarouselClient.tsx
├── PromoCampaignSection.tsx
├── PromoCountdownClient.tsx
├── CollectionsSection.tsx
├── ReviewsSection.tsx
├── ReviewsCarouselClient.tsx
├── TrustBenefitsSection.tsx
├── NewsletterFormClient.tsx
└── skeletons/
    ├── HeroSkeleton.tsx
    ├── CategoriesSkeleton.tsx
    ├── ProductRowSkeleton.tsx
    ├── PromoSkeleton.tsx
    ├── CollectionsSkeleton.tsx
    └── ReviewsSkeleton.tsx

lib/server/
└── homepage.ts
```

## 21. Files Expected to Change

- `app/page.tsx`
- `app/loading.tsx`
- `components/HomePageSkeleton.tsx`
- New `components/home/*` section components
- `context/ProductsContext.tsx` if initial-product hydration is selected
- `components/CampaignCardsCarousel.tsx`
- `lib/server/homepage.ts`
- Relevant homepage API route handlers
- Relevant admin mutation routes for cache invalidation
- `next.config.ts` for final image-domain/storage configuration
- `app/globals.css` for reduced-motion skeleton behavior if needed

## 22. Implementation Phases

### Phase 1 — Measure Baseline

1. Record production-mode Lighthouse metrics
2. Record API count and response sizes
3. Identify LCP element and largest images
4. Record homepage client bundle size
5. Save before screenshots for desktop/mobile

### Phase 2 — Remove Global Loading Block

1. Remove global `pageLoading` gate
2. Add section-level skeletons
3. Add independent error/empty states
4. Ensure fixed skeleton dimensions prevent CLS

### Phase 3 — Server Rendering and Streaming

1. Convert `app/page.tsx` to Server Component
2. Extract interactive client islands
3. Create shared server data helpers
4. Add Suspense boundaries
5. Start independent reads in parallel

### Phase 4 — Data and Cache Optimization

1. Add appropriate cache/revalidation policy
2. Add admin mutation invalidation
3. Limit Firestore queries and payload fields
4. Remove duplicate product requests
5. Add indexes if required

### Phase 5 — Images and Bundle

1. Migrate homepage base64 images to object storage URLs
2. Configure responsive `sizes`
3. Prioritize only first hero/LCP image
4. Lazy-load below-fold interaction code
5. Reduce current homepage Client Component bundle

### Phase 6 — Verification

1. TypeScript
2. ESLint
3. Production build
4. Desktop/mobile visual comparison
5. Slow-network skeleton/progressive loading test
6. API failure isolation test
7. Lighthouse before/after comparison
8. Confirm no hydration or browser console errors

## 23. Acceptance Criteria

- Hero renders without waiting for reviews, collections or trust benefits
- Full-page client loading gate removed
- Every asynchronous section has matching skeleton/error behavior
- Initial HTML contains real hero and primary content
- Independent data reads execute in parallel
- No duplicate homepage product fetch
- Slow/failed non-critical API cannot block entire homepage
- Only first hero image receives priority
- Below-fold carousel JavaScript lazy-loads
- Firestore queries are limited to homepage requirements
- Admin updates invalidate relevant homepage data
- Skeleton-to-content transition causes no noticeable layout jump
- Mobile and desktop appearance remains consistent with current design
- TypeScript, ESLint and production build pass
- Performance metrics show measurable improvement against saved baseline

## 24. Test Checklist

### Loading Behavior

- [ ] Hero can appear before reviews
- [ ] Categories use their own skeleton
- [ ] New Arrivals and Best Sellers load independently
- [ ] Failed campaign disappears without blocking page
- [ ] Skeleton never remains indefinitely after error

### Rendering

- [ ] Initial response contains hero text
- [ ] No hydration mismatch
- [ ] Header/footer remain stable during section streaming
- [ ] Mobile/desktop section dimensions match final content

### Images

- [ ] LCP hero image is optimized and prioritized
- [ ] Remaining hero slides lazy-load
- [ ] Product and collection `sizes` are correct
- [ ] No new base64 homepage images are saved

### Data

- [ ] Queries use active/featured filters and limits
- [ ] Product payload excludes unnecessary detail
- [ ] Cache invalidates after admin changes
- [ ] Promo countdown remains accurate with cached configuration

### Quality

- [ ] TypeScript passes
- [ ] ESLint has no new errors
- [ ] Production build passes
- [ ] Browser console is clean
- [ ] Lighthouse before/after report saved

## 25. Recommended Implementation Order

Highest-value order:

1. Remove global blocking skeleton
2. Make hero server-rendered
3. Add section-level Suspense skeletons
4. Parallelize and cache server reads
5. Remove duplicate product request
6. Optimize/migrate images
7. Lazy-load below-fold carousel JavaScript
8. Measure production results and tune remaining bottlenecks

## 26. Final Recommendation

Homepage ko faster banane ke liye existing full-page skeleton ko delete karna zaroori nahi; usay route-level fallback rehne dein. Main improvement global client loading gate ko section-level streaming architecture se replace karna hai. Hero and first products server-rendered hon, non-critical sections independently stream/lazy-load hon, aur Firestore data cache plus limited queries use kare. Yeh approach perceived speed ke saath actual LCP, payload size, JavaScript cost and resilience improve karega.
