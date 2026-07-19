# Dynamic Promotional Banner, Product Discount and Countdown Plan

## 1. Objective

Homepage ka current hardcoded **Mid-Season Flash Sale** block completely dynamic banaya jayega. Admin:

- banner background image file upload karega;
- badge, heading, description aur button text edit karega;
- promotion ka start/end date and exact time set karega;
- percentage ya fixed discount define karega;
- all products, selected categories, ya specific products select karega;
- coupon-required ya automatic discount mode choose karega;
- banner activate/deactivate aur order manage karega.

Frontend sirf active time-window wali campaign show karega. End time ke baad timer zero par rukega aur poora banner automatically hide ho jayega.

## 2. Current Code That Will Be Replaced

Current homepage implementation in `app/page.tsx` has:

- hardcoded heading, description, coupon and CTA;
- external Unsplash background URL;
- fixed local countdown state;
- countdown expiry ke baad 24 hours par reset/loop;
- static `/shop?cat=sale` link;
- banner aur actual promo eligibility ke darmiyan koi database relation nahi.

Ye tamam hardcoded logic remove hoga.

## 3. Firestore Collections

### `promo-campaigns/{campaignId}`

```ts
{
  id: string;
  internalName: string;          // Admin reference
  badgeText: string;             // e.g. Limited Time Only
  heading: string;               // e.g. Mid-Season Flash Sale
  description: string;           // Fully dynamic customer-facing copy
  highlightText?: string;        // e.g. Flat 30% OFF
  ctaText: string;               // e.g. Shop The Sale

  discountMode: 'automatic' | 'coupon';
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  couponCode?: string;
  minimumOrder: number;

  targetType: 'all-products' | 'selected-products' | 'selected-categories';
  productIds: string[];
  categoryIds: string[];

  startsAt: string;              // ISO UTC timestamp
  endsAt: string;                // ISO UTC timestamp
  timezone: string;              // e.g. Asia/Karachi
  status: 'draft' | 'active' | 'inactive';
  hideAfterExpiry: true;

  backgroundImageId: string;
  backgroundOverlayOpacity: number; // Safe predefined default, normally 0.55
  textAlignment: 'left' | 'center';
  order: number;

  createdAt: string;
  updatedAt: string;
}
```

### `promo-campaign-images/{imageId}`

```ts
{
  id: string;
  campaignId: string;
  dataUrl: string;               // Optimized WebP imported file
  mimeType: 'image/webp';
  role: 'background';
  createdAt: string;
  updatedAt: string;
}
```

No background image URL field will exist. Admin file picker se JPG/PNG/WebP import karega. Browser-side optimizer image ko resize/crop karke WebP banayega, phir database image collection mein save karega.

### Existing `promos/{code}` migration

Existing coupon documents ko immediately delete nahi kiya jayega. Migration ke baad:

- normal standalone coupon codes `promos` mein reh sakte hain;
- homepage timed campaigns `promo-campaigns` mein rahengi;
- campaign coupon ka `campaignId` promo validation ke saath linked hoga;
- current API ka hardcoded `defaultPromos` seeding/fallback remove hoga.

## 4. Product-Specific Discount Rules

Campaign product selection admin mein searchable multi-select hoga. Each option mein product name, category, retail price aur thumbnail/placeholder show hoga.

Eligibility resolver:

```text
all-products         -> every active product eligible
selected-products    -> product.id must exist in campaign.productIds
selected-categories  -> product.categoryId must exist in campaign.categoryIds
```

Product ka permanent `discountPrice` field manual product sale ke liye available rahega. Campaign discount product document mein permanently write nahi hoga. Effective price request/checkout waqt calculate hoga:

1. Active campaign eligibility check.
2. Product manual discount aur campaign discount calculate.
3. Business rule: customer ko lower valid price milega; discounts stack nahi honge.
4. Coupon mode mein valid coupon apply hone ke baad campaign price milega.
5. Automatic mode mein eligible product listing, product page, cart aur checkout par automatically discounted price milega.

This prevents campaign expiry ke baad stale discounted prices.

## 5. APIs

### Admin CRUD

- `GET /api/promo-campaigns?admin=true`
  - all draft, active, inactive and expired campaigns;
- `POST /api/promo-campaigns`
  - campaign create, imported background save, validation;
- `PUT /api/promo-campaigns`
  - campaign/text/image/timing/product selection update;
- `DELETE /api/promo-campaigns?id=...`
  - campaign and associated background image delete.

### Public active campaign

- `GET /api/promo-campaigns/active`
  - server current UTC time use karega;
  - only `status=active`, `startsAt <= now < endsAt` campaigns return hongi;
  - image document resolve karke frontend-safe response dega;
  - expired/draft campaign return nahi hogi;
  - response mein `serverNow` hoga for accurate countdown synchronization.

### Pricing and eligible products

- `GET /api/promo-campaigns/{id}/products`
  - campaign ke eligible active products return karega;
- shop CTA automatically `/shop?campaign={campaignId}` generate karega;
- user ko manual destination URL enter nahi karna padega;
- shop page campaign query se eligible products filter karega.

### Promo validation

- existing `/api/promos` validation ko campaign-aware banaya jayega;
- expired/not-started campaign coupon reject hoga;
- selected product coupon sirf eligible cart lines par apply hoga;
- minimum order eligible subtotal par validate hoga.

### Checkout authority

`POST /api/checkout` client total par trust nahi karega. Server transaction ke andar:

- campaign dobara load karega;
- exact current time and campaign status validate karega;
- eligible product lines identify karega;
- manual/campaign effective unit price calculate karega;
- coupon requirement validate karega;
- discount snapshot order mein save karega;
- inventory deduct aur order create atomically karega.

Order document fields:

```ts
{
  campaignId?: string;
  promoCodeApplied?: string;
  eligibleSubtotal: number;
  discountAmount: number;
  discountSnapshot?: {
    type: 'percentage' | 'fixed';
    value: number;
    campaignName: string;
  };
}
```

## 6. Admin Panel Module

Sidebar mein **Promo Campaigns** module add hoga. Existing **Promo Codes** ko standalone coupons ke liye retain ya clearer label diya jayega.

Campaign form fields:

- Background Image File (required for new campaign)
- automatic responsive cover preview for desktop/mobile
- Internal Name
- Badge Text
- Heading
- Description
- Highlight Text
- CTA Button Text
- Discount Mode: Automatic / Coupon Required
- Discount Type: Percentage / Fixed
- Discount Value
- Coupon Code (only coupon mode)
- Minimum Order
- Target: All Products / Selected Products / Selected Categories
- searchable product/category multi-selector
- Start Date & Time
- End Date & Time
- Status
- Display Order

Admin table/card list mein preview, status, discount, targets, start/end, remaining/expired state, Edit/Delete controls show honge.

Validation:

- end time start time se later ho;
- percentage `> 0` and `<= 100`;
- fixed discount `> 0`;
- selected-products mode mein at least one product;
- selected-categories mode mein at least one category;
- imported image valid JPG/PNG/WebP and configured size limit ke andar;
- active campaign overlap policy explicit ho (recommended: homepage par first active campaign by order).

## 7. Homepage Integration

`app/page.tsx`:

- hardcoded sale section and Unsplash URL remove;
- active campaign API fetch;
- database background image use;
- badge/heading/description/highlight/CTA dynamic render;
- API generated campaign shop route use;
- no active campaign ho to section render hi na ho;
- loading ke dauran layout jump avoid karne ke liye block hidden rahe.

Background alignment client ko set nahi karni padegi:

- desktop/mobile both `object-cover object-center`;
- safe overlay default automatically applied;
- text readability ke liye gradient overlay;
- imported image absent/corrupt ho to supplied `/product-placeholder.png` fallback.

## 8. Exact Dynamic Countdown

Timer remaining duration ko `endsAt - synchronizedNow` se calculate karega, decrementing object state se nahi.

Flow:

1. API `serverNow` and `endsAt` return karegi.
2. Frontend server/browser clock offset calculate karega.
3. Har second remaining milliseconds fresh timestamp difference se calculate honge.
4. Browser tab sleep ke baad timer automatically correct value par jump karega.
5. Zero ya negative remaining time par interval clear hoga.
6. Banner immediately hide hoga.
7. Page refocus par campaign API revalidate hogi.

Display days ki zaroorat par timer `Days / Hours / Mins / Secs` support karega. Otherwise total hours can exceed 24 according to design decision.

## 9. Shop, Product, Cart and Checkout Integration

### Shop

- CTA selected campaign query ke saath shop open karega;
- only eligible products show honge;
- campaign heading/description optional shop header par show hongi;
- original and effective prices with discount percentage show hoga.

### Product detail

- eligible active campaign badge and dynamic campaign text;
- retail price strike-through plus effective price;
- coupon-required mode mein coupon code/copy action;
- expired campaign instantly remove/revalidate.

### Cart

- discount only eligible cart lines par;
- campaign name and savings breakdown;
- coupon validation response server-based;
- quantity/variant change par totals recalculate.

### Checkout

- final authoritative server calculation;
- expiry checkout ke waqt ho jaye to clear error and refreshed total;
- order stores pricing snapshot for future audit.

## 10. Security and Data Integrity

- Admin campaign write routes require admin authorization.
- Public API only active, safe fields expose kare.
- Client-supplied campaign ID, coupon, discount amount or product price trusted nahi honge.
- Dates ISO UTC mein store hongi; admin input Asia/Karachi se UTC convert hoga.
- Image payload format and size validate hoga.
- Campaign delete par image document cleanup hoga.
- Checkout Firestore transaction stock and price consistency maintain karegi.

## 11. Migration and Cleanup

- homepage hardcoded flash-sale text remove;
- static timer and its 24-hour reset logic remove;
- promotion background external URL remove;
- static CTA `/shop?cat=sale` remove;
- `/api/promos` hardcoded default promo fallback/seeding remove;
- any fake rating/sold-based sale filtering remove;
- existing manually discounted products preserve;
- existing valid promo documents migrate/normalize without deleting client data.

## 12. Implementation Sequence

1. Campaign and image types/schema create.
2. Campaign CRUD and active-campaign APIs create.
3. Server pricing/eligibility resolver create with tests.
4. Admin Promo Campaigns sidebar/module implement.
5. Image import, optimization and previews implement.
6. Homepage static block replace with active campaign component.
7. Accurate synchronized countdown implement.
8. Shop campaign filter and generated CTA route implement.
9. Product/cart pricing and dynamic text integrate.
10. Checkout authoritative campaign calculation integrate.
11. Old hardcoded promo/timer/background data remove.
12. Expired, future, inactive, coupon, automatic, product-specific, category-specific and stock checkout cases verify.

## 13. Acceptance Criteria

- Admin imported background image database se homepage par show ho.
- No background image URL input exists.
- All customer-facing banner text database-driven ho.
- CTA automatically correct campaign products open kare.
- Specific products/categories admin se select ho saken.
- Non-eligible product par campaign discount apply na ho.
- Exact start time se pehle banner hidden ho.
- Exact end time par banner and discount both stop/hide hon.
- Refresh/tab sleep ke baad countdown accurate ho.
- Checkout expired/invalid campaign discount accept na kare.
- No active campaign par homepage mein empty gap na ho.
- Mobile and desktop background automatically aligned/readable ho.

## Current Product Data State

- `products`: 50 seeded database products.
- `product-variants`: 400 color/size stock records.
- Seeded products have no external image URLs.
- Missing product images use local `/product-placeholder.png` automatically.

