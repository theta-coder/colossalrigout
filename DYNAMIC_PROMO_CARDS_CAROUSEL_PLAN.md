# Dynamic Campaign Cards, Carousel and User Redemption Plan

## 1. Recommended Product Direction

Homepage ke current three hardcoded cards ko ek reusable **Campaign Cards** system banana chahiye. Har card discount hona zaroori nahi. Same module se ye content publish ho sakega:

- sale or coupon;
- automatic product discount;
- student/new-user offer;
- store visit discount;
- new collection/product announcement;
- coming soon message;
- event or store opening;
- general informational CTA.

Admin jitne cards chahe create kare. Frontend active schedule aur order ke mutabiq cards render kare.

## 2. Recommended Discount Strategy

Har roz arbitrary discount set karna risky hai. Admin ko predefined campaign purposes aur safe defaults milne chahiye, magar final value editable ho:

| Campaign purpose | Recommended offer | Recommended limit |
|---|---:|---|
| First order | 10% | One use per user |
| Student offer | 10% | One use per user or once per season |
| Store visit | 10% or fixed amount | One use per user, in-store channel |
| New season launch | No discount or 10–15% | Selected collection, short period |
| Weekend sale | 15–20% | Selected products/categories |
| Mid-season sale | 20–30% | Selected products/categories |
| Clearance | 30–50% | Clearance products only, no stacking |
| Loyal customer | 10–20% | Two uses or configured limit |
| Announcement | No discount | No login required |

System percentage suggest karega, lekin retail margin system ko pata na ho to automatic “best discount” decide nahi karega. Admin minimum order, maximum discount amount, product scope and usage limit set karega.

## 3. Firestore Database Design

### `campaign-cards/{cardId}`

```ts
{
  id: string;
  internalName: string;
  cardType: 'discount' | 'announcement' | 'store' | 'new-arrival' | 'event';

  eyebrowText: string;       // STUDENTS GET / NEW SEASON
  heading: string;           // 10% OFF / NEW LOOK
  description: string;
  buttonText: string;

  imageId: string;
  overlayOpacity: number;    // sensible default, client need not align manually
  textPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

  actionType: 'campaign-products' | 'collection' | 'product' | 'store-location' | 'custom-page';
  productId?: string;
  collectionId?: string;
  storeId?: string;
  internalPath?: string;     // validated internal route only; no external image URL

  hasDiscount: boolean;
  promotionId?: string;

  startsAt: string;
  endsAt: string;
  timezone: 'Asia/Karachi';
  status: 'draft' | 'active' | 'inactive';
  order: number;

  createdAt: string;
  updatedAt: string;
}
```

### `campaign-card-images/{imageId}`

```ts
{
  id: string;
  cardId: string;
  dataUrl: string;           // imported and optimized WebP
  mimeType: 'image/webp';
  role: 'card-background';
  createdAt: string;
  updatedAt: string;
}
```

Image URL input nahi hoga. File picker JPG/PNG/WebP accept karega, image auto-resize/crop hogi, database mein stored asset reference card par save hoga. Missing image par `/product-placeholder.png` show hoga.

### `promotions/{promotionId}`

```ts
{
  id: string;
  name: string;
  publicMessage: string;       // e.g. Login and get 10% off this product

  discountType: 'percentage' | 'fixed' | 'free-shipping';
  discountValue: number;
  maximumDiscount?: number;
  minimumOrder: number;

  applicationMode: 'automatic' | 'coupon';
  couponCode?: string;
  stackable: boolean;          // recommended default false

  targetType: 'all-products' | 'selected-products' | 'selected-categories' | 'selected-collections';
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];

  loginRequired: boolean;
  maxUsesPerUser: number;      // 1, 2, 3 etc.; null only for unlimited
  globalUsageLimit?: number;
  usedCount: number;

  channel: 'online' | 'in-store' | 'both';
  storeIds: string[];

  startsAt: string;
  endsAt: string;
  status: 'draft' | 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
```

`maxUsesPerUser` se same promotion ek user ko one-time, two-time ya configured multiple uses diya ja sakega. Multiple different promotions bhi same user account ke saath independently work karengi.

### `promotion-redemptions/{redemptionId}`

```ts
{
  id: string;
  promotionId: string;
  userId: string;
  orderId?: string;
  storeId?: string;
  channel: 'online' | 'in-store';
  discountAmount: number;
  redeemedAt: string;
}
```

Recommended deterministic/traceable identity:

```text
promotionId + userId + orderId
```

Usage count `promotion-redemptions` se verify hoga. Browser localStorage/cookie ko authoritative record nahi mana jayega.

### Optional `stores/{storeId}`

Visit In Store card ko dynamic banane ke liye:

```ts
{
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  mapUrl?: string;
  active: boolean;
}
```

Store card `storeId` aur optional store promotion select karega. Is tarah “Visit Us In Store” bhi sale card ban sakta hai, for example: **Visit Gulberg Store & Get 10% Off**.

## 4. Login and Redemption Rules

### Discount card

- Guest card dekh sakta hai.
- Button click par, agar `loginRequired=true`, user login/signup par redirect hoga.
- Successful login ke baad same card/action par return hoga.
- API authenticated Firebase user ID se eligibility check karegi.
- One-use promotion: existing redemption count `>= 1` ho to reject.
- Two-use promotion: count `>= 2` ho to reject.
- Multi-promo: each promotion ka count separately maintained hoga.
- Announcement cards ke liye login zaroori nahi hoga.

### Important security rule

Frontend sirf message show karega; final permission server decide karega. Checkout Firestore transaction mein:

1. authenticated user verify;
2. promotion schedule/status verify;
3. target product eligibility verify;
4. per-user and global usage limit verify;
5. price/discount server-side calculate;
6. order and redemption atomically create;
7. `usedCount` safely increment.

Is se same user refresh, another browser ya direct API request se extra redemption nahi le sakega.

## 5. APIs

### Campaign Cards

- `GET /api/campaign-cards/active`
  - public, scheduled active cards only;
  - sorted by `order`;
  - imported image resolve;
- `GET /api/campaign-cards?admin=true`
  - all cards including drafts/expired;
- `POST /api/campaign-cards`
  - create card and background asset;
- `PUT /api/campaign-cards`
  - update card/image/order/status;
- `DELETE /api/campaign-cards?id=...`
  - card plus associated image cleanup;
- `PUT /api/campaign-cards/reorder`
  - ordered IDs save.

### Promotions

- `GET /api/promotions?admin=true`
- `POST /api/promotions`
- `PUT /api/promotions`
- `DELETE /api/promotions?id=...`
- `POST /api/promotions/eligibility`
  - logged-in user + promotion + current cart/product eligibility;
- `POST /api/promotions/apply`
  - server-calculated preview, not final redemption;
- checkout endpoint final redemption transaction perform karega.

### Stores

- `GET /api/stores`
- admin CRUD `/api/stores`

## 6. Admin Sidebar Modules

### Campaign Cards

Fields:

- Card Type
- imported Background Image
- live desktop/mobile preview
- Eyebrow Text
- Heading
- Description
- Button Text
- Action Type
- Product/Collection/Store selector according to action
- Attach Promotion toggle/dropdown
- Start/End Date & Time
- Status
- Display Order

Destination link manually type karna normally required nahi hoga. Selected action se link auto-generate hoga.

### Promotions

Fields:

- promotion name and customer message;
- percentage/fixed/free shipping;
- value, minimum order and maximum discount;
- automatic/coupon mode;
- all/specific products/categories/collections selectors;
- login required;
- max uses per user: 1, 2, custom, unlimited;
- global usage limit;
- online/in-store/both;
- selected stores;
- start/end time and status;
- redemption count and remaining availability.

### Redemption Report

Admin can see:

- user name/email;
- promotion;
- order/store;
- redemption count;
- amount saved;
- redeemed timestamp.

Recommended: Promotions module ke andar report tab, separate sidebar module only if report becomes large.

### Stores

Store locations reusable module. Campaign card mein store dropdown show hoga, address repeatedly type nahi karna padega.

## 7. Responsive Card and Carousel Behavior

Layout rules:

| Active cards | Desktop layout | Tablet layout | Mobile layout |
|---:|---|---|---|
| 0 | Section hidden | Hidden | Hidden |
| 1 | One full-width card | One card | One card |
| 2 | Two equal cards | Two or carousel | One-card swipe carousel |
| 3 | Three equal cards | Two visible carousel | One-card swipe carousel |
| More than 3 | Three visible auto carousel | Two visible auto carousel | One visible auto carousel |

Carousel behavior:

- auto-play only when card count exceeds current visible capacity;
- desktop approximately 5 seconds per movement;
- pause on hover, keyboard focus and user interaction;
- touch swipe on mobile;
- previous/next arrows;
- dots/page indicator;
- loop smoothly;
- prefers-reduced-motion users ke liye auto-play disabled;
- hidden/inactive/expired cards count mein include nahi honge;
- card height consistent, image `object-cover object-center`;
- text safe overlay/gradient with automatic alignment defaults.

Recommended implementation: lightweight existing React/CSS state carousel. New large library ki zaroorat nahi; accessible behavior manually small component mein maintain ho sakta hai. Agar future mein complex drag/free-mode required ho to Embla Carousel best upgrade option hoga.

## 8. Frontend Action Flows

### Discount card

```text
Card click
  -> login required and guest?
     -> login -> return to campaign
  -> eligibility API
  -> eligible products shop filter or selected product
  -> dynamic campaign message/prices
  -> cart/checkout server validation
  -> redemption stored
```

### Announcement/new arrival card

```text
Card click -> selected collection/product/page
```

No promotion or login required.

### Store promotion card

```text
Card click -> login if required -> eligibility check
           -> store detail/contact page
           -> code/QR or staff-verifiable redemption reference
```

For secure physical-store redemption, later phase mein staff/admin **Redeem** action or one-time QR token use karna recommended hai. Customer ko plain reusable coupon dikhana one-use control ke liye enough nahi.

## 9. Dynamic Customer Text

Card text admin-entered hoga. Discount-specific dynamic tokens optionally supported hon:

```text
{{discount}}       -> 10% OFF / $20 OFF
{{coupon}}         -> WELCOME10
{{endDate}}        -> Jul 31
{{remainingUses}}  -> 1 use remaining
{{storeName}}      -> Gulberg III
```

Example admin copy:

```text
Login and enjoy {{discount}} on selected summer products.
You can use this offer {{remainingUses}} more time.
```

API safe resolved values return karegi. Raw HTML allow nahi hoga.

## 10. Existing Project Integration

### `app/page.tsx`

- three hardcoded card blocks remove;
- Unsplash card image URLs remove;
- dynamic `CampaignCardsCarousel` component add;
- active-card API attach.

### Authentication

- existing Firebase authentication/user context use;
- login route ko `returnTo` parameter support;
- promotion eligibility Firebase UID based.

### Shop/Product

- selected promotion/product filter;
- dynamic promo message;
- effective discount price;
- used/not-eligible state.

### Cart/Checkout

- eligible line calculation;
- non-stackable rules;
- usage-limit verification;
- atomic order + redemption + stock update.

### Admin

- Campaign Cards link;
- Promotions enhanced module;
- Stores module;
- redemption report.

## 11. Promotion Conflict Rules

Recommended default rules:

1. One product line par one promotion only.
2. Manual product discount aur campaign discount mein lower customer price win kare.
3. Two coupon promotions stack na hon unless admin explicitly enables.
4. Shipping promotion product price promotion ke saath optionally allowed.
5. Fixed discount eligible subtotal se greater nahi ho sakta.
6. Expired promotion cart se automatically remove ho.
7. User-limit reached ho to card optionally visible rahe magar button `Already Used` show kare, ya admin `hideAfterUsed` select kar sake.

## 12. Implementation Phases

1. Campaign card, promotion, redemption and store schemas/types.
2. Admin-secured CRUD APIs.
3. Imported image storage and cleanup.
4. Promotion eligibility/pricing resolver.
5. Campaign Cards admin sidebar module.
6. Enhanced Promotions module with product selection and usage limits.
7. Stores module and store promotion association.
8. Responsive one/two/three-card grid plus auto carousel.
9. Login-return and per-user eligibility UI.
10. Shop/product/cart integrations.
11. Transactional checkout redemption.
12. Remove static cards and URLs.
13. Test responsive layouts, time windows, one/two-use limits, multiple promotions and concurrent checkout.

## 13. Acceptance Criteria

- Admin 1, 2, 3 or unlimited cards create/order kar sake.
- More than viewport capacity par carousel automatically move kare.
- Mobile one-card swipe experience ho.
- Card sale aur non-sale announcement dono support kare.
- Visit Store card promotion attach kar sake.
- Images only imported files/database assets hon.
- Card link selected content se automatically generate ho.
- Discount card configured condition par login require kare.
- Same user one-use promotion dobara redeem na kar sake.
- Two-use promotion exactly two successful redemptions allow kare.
- Same user multiple different promotions use kar sake.
- Expired/inactive cards automatically hide hon.
- Checkout client-edited discount reject kare.
- Empty card list par homepage gap render na ho.

