# Dynamic Shop by Category — Implementation Plan

## Objective

Homepage ke static **Shop by Category** section ko fully dynamic banana hai. Admin categories ko create, edit, delete, reorder, activate/deactivate aur image/link ke sath manage kar sake. Frontend data API se load kare aur database single source of truth ho.

## Existing Project Context

- Frontend/backend framework: Next.js App Router + TypeScript
- Database: Firebase Firestore
- Existing admin dashboard: `app/admin/page.tsx`
- Existing API pattern: `app/api/*/route.ts`
- Current category section: `app/page.tsx` mein hard-coded

## Proposed Data Model

Firestore collection: `shop-categories`

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Stable document/category identifier |
| `name` | string | Frontend display name |
| `slug` | string | Shop filtering key, e.g. `tops` |
| `image` | string | Category image URL |
| `link` | string | Destination URL |
| `order` | number | Display sequence |
| `active` | boolean | Frontend visibility control |
| `style` | `image \| sale` | Normal image card or special sale card |
| `createdAt` | timestamp | Creation audit field |
| `updatedAt` | timestamp | Last-update audit field |

## API Contract

Base route: `/api/categories`

- `GET /api/categories`
  - Active categories ko ordered form mein frontend ke liye return karega.
  - Admin mode/query par inactive records bhi return kiye ja sakte hain.
- `POST /api/categories`
  - New category create karega.
  - Required fields validate karega aur duplicate slug reject karega.
- `PUT /api/categories`
  - Existing category update karega.
- `DELETE /api/categories?id={id}`
  - Selected category delete karega.
- Optional bulk reorder endpoint/action
  - Multiple categories ka order safely update karega.

Standard response shape:

```json
{
  "success": true,
  "data": {},
  "message": "Category saved successfully"
}
```

## Admin Module

Admin sidebar mein **Shop Categories** tab add hoga.

Features:

- Category list/table with image preview
- Add category form
- Edit category
- Delete with confirmation
- Active/inactive toggle
- Display order control
- Card style selection (`image` or `sale`)
- Name, slug, image URL and destination link validation
- Loading, empty, success and error states
- Mobile-responsive admin layout

## Frontend Integration

- `app/page.tsx` ki hard-coded category array remove hogi.
- Categories `/api/categories` se fetch hongi.
- Sirf active categories `order` ke mutabiq show hongi.
- Existing responsive desktop/mobile design preserve hoga.
- Image alt text category name se generate hoga.
- API failure par controlled empty/error state ya temporary fallback policy use hogi—final behavior implementation se pehle confirm hoga.

## Validation and Security

- Server-side payload validation
- Slug normalization and uniqueness
- Safe numeric order validation
- Allowed style values only
- Admin mutation routes par authentication/authorization check
- Firestore rules ko public read + admin-only write model ke mutabiq tighten karna
- User-entered URLs aur image values validate karna

## Loop Engineering Execution Plan

### Loop 1 — Discovery and Contract

1. Existing home, shop filters, admin auth, APIs and Firestore usage inspect karna.
2. Category fields aur frontend filtering compatibility confirm karna.
3. API contract and acceptance criteria freeze karna.
4. TypeScript/build baseline record karna.

Exit condition: schema aur API behavior clear ho; existing build baseline known ho.

### Loop 2 — Database and API

1. Shared `ShopCategory` type/schema create karna.
2. Firestore collection integration banana.
3. GET/POST/PUT/DELETE handlers implement karna.
4. Validation, normalized errors and ordering add karna.
5. Default records ke liye one-time seed strategy add karna.

Exit condition: CRUD API valid/invalid cases mein predictable response de.

### Loop 3 — Admin Categories Module

1. Sidebar tab aur categories state add karna.
2. List, add/edit form, status and ordering controls implement karna.
3. Delete confirmation and feedback states add karna.
4. Responsive behavior verify karna.

Exit condition: admin se complete category lifecycle database mein manage ho.

### Loop 4 — Dynamic Homepage

1. Static array remove karna.
2. API-driven ordered active categories render karna.
3. Sale style and standard image style preserve karna.
4. Loading, error and empty states finalize karna.

Exit condition: homepage category content mein change sirf admin/database update se reflect ho.

### Loop 5 — Security, Quality and Performance

1. Admin write authorization verify karna.
2. Firestore rules review/update karna.
3. Duplicate slug, missing image, invalid link and order collision test karna.
4. Unnecessary requests/renders remove karna; caching/revalidation policy apply karna.
5. TypeScript, lint and production build run karna.

Exit condition: no known critical errors, unauthorized writes blocked, production build passes.

### Loop 6 — Final QA and Handover

1. Desktop and mobile visual regression check.
2. Admin create → homepage display → edit → reorder → deactivate → delete flow test.
3. API failure behavior verify karna.
4. Changed files, database setup and usage instructions document karna.

Exit condition: acceptance checklist complete and reproducible handover available ho.

## Acceptance Criteria

- Homepage par koi hard-coded category content source na ho.
- Admin se category add/edit/delete ho sake.
- Active/inactive state frontend par correctly apply ho.
- Display order admin/database ke mutabiq ho.
- Image and sale cards existing design ke compatible hon.
- API errors user-friendly feedback dein.
- Database writes authorized admin tak restricted hon.
- TypeScript and production build pass karein.
- Existing product, hero, promo and order modules regress na hon.

## Scope Guard

Is phase ka scope sirf **Shop by Category** module hai. Products, hero carousel, collections, reviews ya complete admin rewrite tab tak scope mein nahi honge jab tak separately approve na kiye jayen.

## Implementation Status

- [x] Plan prepared
- [ ] Discovery loop approved
- [ ] Database/schema implemented
- [ ] Categories API implemented
- [ ] Admin module implemented
- [ ] Homepage integrated
- [ ] Security and QA completed
