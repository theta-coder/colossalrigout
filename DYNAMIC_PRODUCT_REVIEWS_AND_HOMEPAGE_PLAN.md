# Dynamic Product Reviews, Moderation and Homepage Reviews Plan

## 1. Objective

Current static homepage testimonials aur manually typed Product ID review form ko fully dynamic review system se replace karna hai.

Final behaviour:

- customer review sirf selected product ke against submit karega;
- har new customer review ka default status `pending` hoga;
- pending/rejected review frontend par kabhi show nahi hoga;
- admin product ID type nahi karega; searchable product dropdown se product select karega;
- admin pending review approve ya reject karega;
- approved reviews corresponding product detail page par show honge;
- homepage par database se latest **5 approved reviews** show honge;
- product rating aur review count approved reviews se automatically calculate honge;
- existing hardcoded homepage reviews completely remove honge;
- initial demonstration ke liye 5 fake approved reviews idempotent seed endpoint se create honge.

## 2. Current Project Audit

Existing implementation partial hai:

- Firestore `reviews` collection already referenced hai;
- product page review submission form already present hai;
- admin sidebar mein `Review Moderation` module already present hai;
- admin review form abhi raw `Product ID` input use karta hai;
- homepage reviews `app/page.tsx` mein hardcoded array hain;
- project mein reviews ke liye do competing APIs hain:
  - `/api/reviews`;
  - `/api/commerce/reviews`.
- product page generic `/api/commerce/reviews` use kar raha hai;
- separate `/api/reviews` mein moderation logic hai, magar admin module us canonical workflow ko consistently use nahi karta;
- aggregate rating recalculation status transitions par completely reliable nahi hai, especially approved review reject/delete hone par.

Implementation mein ek hi canonical API contract use hoga. Generic commerce review mutations remove/disable karke reviews ko dedicated APIs par move kiya jayega.

## 3. Firestore Database Design

### 3.1 `reviews/{reviewId}`

```ts
{
  id: string;
  productId: string;               // products/{productId} reference identifier
  productNameSnapshot: string;     // moderation/history display
  productSlugSnapshot: string;

  userId: string | null;           // Firebase authenticated user, if logged in
  orderId: string | null;
  orderItemId: string | null;

  customerName: string;
  customerEmail: string;           // admin only; never returned by public APIs
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;

  verifiedPurchase: boolean;       // server calculates from orders, client cannot set it
  status: 'pending' | 'approved' | 'rejected';
  source: 'customer' | 'admin-seed';

  adminNote: string;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Important rules:

- public submission always `pending` save hogi;
- client-supplied `status`, `verifiedPurchase`, `moderatedBy` ignore honge;
- `productId` save karne se pehle product document existence verify hogi;
- product name snapshot historical display ke liye save hoga, lekin frontend current product name ko primary source rakhega;
- public response se `customerEmail`, `adminNote`, `moderatedBy` remove honge.

### 3.2 Existing `products/{productId}` aggregate fields

```ts
{
  aggregateRating: number;          // e.g. 4.6
  approvedReviewCount: number;
  ratingBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  reviewsUpdatedAt: string;
}
```

These fields sirf approved reviews se calculate honge. Pending/rejected reviews aggregate mein include nahi honge.

### 3.3 Optional review uniqueness document

Verified customer ko same order item ke liye duplicate review se rokne ke liye:

`review-submissions/{userId}_{orderId}_{productId}`

```ts
{
  reviewId: string;
  userId: string;
  orderId: string;
  productId: string;
  createdAt: string;
}
```

Guest reviews allowed rakhne hon to email/IP based permanent blocking nahi lagani; spam protection/rate limiting separately use hogi.

## 4. Canonical API Design

### 4.1 `POST /api/reviews`

Customer review submission.

Request:

```ts
{
  productId: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string;
  body: string;
  orderId?: string;
}
```

Backend responsibilities:

- fields trim/sanitize kare;
- rating 1–5 validate kare;
- title/body length limits validate kare;
- product Firestore mein verify kare;
- Firebase ID token ho to `userId` token se le, request body se nahi;
- order ownership aur product line server-side verify karke `verifiedPurchase` set kare;
- review `pending` status mein save kare;
- customer ko moderation confirmation return kare.

### 4.2 `GET /api/reviews?productId={id}`

Public product review endpoint.

- sirf `approved` reviews return kare;
- newest first sorting;
- pagination: `limit` and cursor;
- private moderation/customer email fields omit kare;
- product rating summary return kare.

Suggested response:

```ts
{
  success: true;
  data: ReviewPublic[];
  summary: {
    averageRating: number;
    reviewCount: number;
    ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  nextCursor: string | null;
}
```

### 4.3 `GET /api/reviews/latest?limit=5`

Homepage endpoint:

- `status == approved` only;
- `createdAt desc` or preferably `moderatedAt desc`;
- maximum public limit capped at 5;
- product document/name and `/product?id={productId}` link attach kare;
- deleted/inactive product review ko optionally exclude kare;
- customer email/admin notes never return kare.

### 4.4 `GET /api/admin/reviews`

Protected admin endpoint:

- Firebase admin authentication required;
- status filters: pending/approved/rejected/all;
- product filter;
- search by customer, title or product name;
- newest first pagination;
- moderation counters return kare.

### 4.5 `PATCH /api/admin/reviews/{reviewId}`

Moderation endpoint:

```ts
{
  status: 'approved' | 'rejected' | 'pending';
  adminNote?: string;
}
```

Backend transaction:

1. review read kare;
2. status update kare;
3. `moderatedBy` authenticated admin UID se set kare;
4. `moderatedAt` set kare;
5. corresponding product ke tamam approved reviews se aggregate recalculate kare;
6. product `aggregateRating`, `approvedReviewCount`, `ratingBreakdown` update kare.

Aggregate recalculation in all cases required hai:

- pending → approved;
- approved → rejected;
- rejected → approved;
- approved review delete;
- approved review rating/product edit.

### 4.6 `DELETE /api/admin/reviews/{reviewId}`

- admin protected;
- confirmation required;
- review approved ho to deletion ke baad product aggregate recalculate ho;
- recommended production option: hard delete ke bajaye audit-friendly `deletedAt` soft delete.

### 4.7 `POST /api/admin/reviews/seed`

Development/demo seed endpoint:

- admin protected;
- current `products` collection se active products select kare;
- exact 5 deterministic IDs use kare so endpoint repeat karne se duplicates na bane;
- fake records `source: 'admin-seed'`, `status: 'approved'` hon;
- product missing ho to placeholder ID create na kare—available real product select kare;
- seed ke baad affected product aggregates rebuild kare;
- production mein seed button hidden/disabled ya explicit admin confirmation ke saath ho.

Suggested fake review content:

1. Ayesha K. — 5 stars — fabric quality/fit;
2. Hamza R. — 5 stars — delivery/product quality;
3. Sana M. — 4 stars — product matched photos;
4. Bilal A. — 5 stars — comfort/value;
5. Mahnoor S. — 5 stars — packaging and sizing.

Fake reviews ko available real product records ke saath attach kiya jayega; raw imaginary product IDs use nahi honge.

## 5. Admin Review Moderation Module

Existing generic review form ko dedicated `ReviewsAdminModule` se replace karna recommended hai.

### Product selection

Raw `Product ID` field completely remove hoga.

Searchable dropdown mein show ho:

- product thumbnail;
- product display name;
- category;
- SKU/ID small secondary text mein;
- active/inactive badge.

Admin product name type karke search kare aur result select kare. Saved value internally `productId` hi hogi, lekin admin ko ID manually type nahi karni padegi.

### Moderation layout

Tabs/counters:

- Pending;
- Approved;
- Rejected;
- All.

Every review row/card:

- rating stars;
- title and complete review body;
- customer name/email (admin only);
- selected product thumbnail/name/link;
- submitted date;
- verified purchase badge;
- source badge (`Customer` or `Seed`);
- Approve button;
- Reject button;
- Return to Pending option;
- admin note;
- delete action with confirmation.

Default admin use case moderation hai. Manual “Add Review” form optional demo/support tool hoga and normal customer workflow ka substitute nahi hoga.

### Security

- list, moderation, delete and seed endpoints `requireAdmin()` use karein;
- admin module authenticated `adminApiFetch()` use kare;
- public user status/verified flags control nahi kar sakta;
- direct client Firestore writes remove hon;
- errors and moderation audit metadata store hon.

## 6. Product Detail Frontend Integration

`app/product/page.tsx` ko `/api/commerce/reviews` ke bajaye canonical `/api/reviews?productId=...` use karna hai.

Product page par:

- average rating and approved review count;
- rating distribution;
- approved reviews newest first;
- verified buyer badge;
- pagination/Load More;
- customer submission form;
- successful submission ke baad “Pending admin approval” message;
- submitted pending review immediately public list mein insert nahi hoga.

Review submission ke waqt `productId` current page product se automatically attach hoga. Customer ko product ID input nahi milega.

If logged in:

- name/email profile se prefill;
- Firebase ID token request ke saath send;
- eligible order/product choose karne ka option diya ja sakta hai;
- server verified purchase determine karega.

## 7. Homepage Integration — Latest Five Reviews

`app/page.tsx` ka hardcoded `reviews` array remove hoga.

Homepage component startup par:

```text
GET /api/reviews/latest?limit=5
```

Rules:

- exactly maximum 5 latest approved reviews;
- fewer than 5 available hon to jitne approved hain utne show hon;
- zero approved reviews hon to complete section hide ya professional empty state;
- pending/rejected reviews never render;
- product name clickable ho and relevant product detail open kare;
- existing responsive carousel design retain ho;
- carousel `reviews.length` se max index calculate kare, hardcoded `4` se nahi;
- desktop 3, tablet 2, mobile 1 visible review;
- arrows only when reviews visible capacity se zyada hon;
- touch swipe, keyboard labels and reduced-motion support;
- loading skeleton optional, layout shift minimum.

Homepage review card fields:

- 1–5 stars;
- review text;
- customer display name;
- `Verified buyer` badge only when server verified;
- real product name;
- product link.

## 8. Aggregate Rating Service

Duplicate aggregate logic APIs mein copy nahi karni. Shared server helper create ho:

`lib/server/reviews.ts`

Suggested functions:

```ts
validateReviewInput(input)
toPublicReview(document)
recalculateProductReviewSummary(productId)
verifyPurchasedProduct(userId, orderId, productId)
```

This prevents `/api/reviews`, moderation and seed endpoints ke results different hone se.

## 9. Required Firestore Indexes

Recommended composite indexes:

```text
reviews: status ASC, moderatedAt DESC
reviews: status ASC, createdAt DESC
reviews: productId ASC, status ASC, createdAt DESC
reviews: productId ASC, status ASC, moderatedAt DESC
```

Optional moderation filter index:

```text
reviews: status ASC, productId ASC, createdAt DESC
```

Index errors ke provided Firebase console links deployment ke waqt follow karke `firestore.indexes.json` commit karna hai.

## 10. Firestore Rules and Privacy

Production rules:

- public clients ko `reviews` collection direct list/write permission nahi;
- review submission API ke through ho;
- approved review public API read kare;
- admin moderation authenticated protected API ke through ho;
- email/public PII response mein expose na ho;
- products aggregate fields customer directly update na kar sake;
- current sandbox `allow read, write: if true` production se pehle replace karna required hai.

Because current server routes Firebase client SDK use karte hain, production rules lock karne se pehle Firebase Admin SDK/service account server integration complete karna hoga.

## 11. Validation and Abuse Protection

- customer name: 2–80 characters;
- title: 3–120 characters;
- body: 10–1500 characters;
- rating: integer 1–5;
- email normalized and validated;
- HTML/script tags store/render na hon;
- request size limit;
- rate limiting by authenticated user/IP;
- optional CAPTCHA for guest submissions;
- duplicate order-product review prevention;
- React text rendering only, `dangerouslySetInnerHTML` use na ho.

## 12. Data Migration and Static Removal

Implementation migration:

1. existing review documents normalize kare;
2. missing `productNameSnapshot`, `source`, `updatedAt` fields backfill kare;
3. invalid/missing products wale reviews report kare, automatically approve na kare;
4. approved reviews se all product aggregates rebuild kare;
5. homepage static four-review array remove kare;
6. product page `/api/commerce/reviews` calls remove kare;
7. generic commerce review mutation support remove/disable kare;
8. dedicated review APIs and module ko single source of truth banaye;
9. 5 idempotent fake approved reviews seed kare;
10. homepage latest endpoint result verify kare.

## 13. Implementation Order

### Phase 1 — Backend foundation

1. shared review validation/aggregate helper;
2. canonical public review API;
3. protected admin list/moderation/delete APIs;
4. latest five homepage API;
5. verified purchase server validation;
6. Firestore indexes.

### Phase 2 — Admin

1. dedicated review moderation component;
2. products API se searchable product dropdown;
3. status tabs/counters/search;
4. approve/reject workflow;
5. seed-five-reviews action;
6. admin authentication headers.

### Phase 3 — Frontend

1. product page canonical approved reviews;
2. customer pending submission;
3. product rating summary;
4. homepage hardcoded reviews removal;
5. latest five dynamic carousel;
6. responsive/accessibility behaviour.

### Phase 4 — Migration and verification

1. existing data normalization;
2. aggregate rebuild;
3. seed fake reviews;
4. API authorization tests;
5. pending-review visibility tests;
6. responsive carousel tests;
7. TypeScript, lint and production build.

## 14. Acceptance Criteria

- admin never manually types a Product ID;
- product dropdown live database products show karta ho;
- customer review always pending create hota ho;
- only admin review approve/reject kar sake;
- pending/rejected review homepage/product page par absent ho;
- approved review correct product page par show ho;
- approved → rejected transition ke baad rating/count decrease ho;
- homepage par maximum latest 5 approved reviews hon;
- homepage static review data completely removed ho;
- product name/card correct product URL open kare;
- verified buyer sirf server-confirmed order par show ho;
- fake five reviews real existing products se attached hon and seed repeat karne se duplicate na hon;
- public APIs private email/admin metadata expose na karein;
- all review flows same canonical API and Firestore collection use karein;
- TypeScript, ESLint and production build pass hon.

## 15. Files Expected to Change During Implementation

```text
app/page.tsx
app/product/page.tsx
app/admin/page.tsx
app/api/reviews/route.ts
app/api/reviews/latest/route.ts
app/api/admin/reviews/route.ts
app/api/admin/reviews/[id]/route.ts
app/api/admin/reviews/seed/route.ts
app/api/commerce/[resource]/route.ts
components/HomeReviewsCarousel.tsx
components/admin/ReviewsAdminModule.tsx
lib/server/reviews.ts
lib/admin-api.ts
types/commerce.ts
firestore.indexes.json
firestore.rules
```

This plan reviews ko actual products, customer submission, admin approval, product aggregates aur homepage latest-five display ke saath one consistent database-backed system mein convert karega.
