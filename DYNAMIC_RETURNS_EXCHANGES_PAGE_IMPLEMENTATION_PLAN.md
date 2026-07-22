# Dynamic Returns & Exchanges Page — Complete Implementation Plan

## 1. Goal

Current `/returns` page ka hard-coded policy content Firestore aur Admin Panel se fully manageable banana hai, jabke existing storefront design, responsive layout aur visual hierarchy preserve rahe.

Admin sidebar mein dedicated **Returns & Exchanges** module hoga. Admin bina code changes ke:

- Page title aur introductory return-window card edit kare
- Return conditions add/edit/hide/delete/reorder kare
- Return process steps manage kare
- Refund aur exchange information sections manage kare
- Bottom support CTA edit kare
- Storefront visibility control kare

## 2. Current Page Structure

Current `app/returns/page.tsx` mein following content hard-coded hai:

1. Hero heading: `RETURNS & EXCHANGES`
2. Return-window highlight card
3. Return Conditions heading and bullet list
4. “How to Return an Item” ordered steps
5. Refund Timeline section
6. Exchanges section
7. Bottom Contact Support CTA

First implementation mein existing hero background image and page layout preserve rahenge. Content database-driven hoga.

## 3. Recommended First-Version Scope

### Included

- Dynamic page settings
- Dynamic return conditions
- Dynamic return process steps
- Dynamic information sections
- Dynamic support CTA
- Add, edit and delete
- Active/Hidden visibility
- Numeric ordering and Move Up/Down
- Loading, error, empty and retry states
- Existing hard-coded content migration/seed
- Firestore-backed public/admin APIs
- Server-side validation
- Admin authorization on mutations
- Plain-text safe rendering

### Not Included in This Content Module

- Actual customer return-request workflow
- Automatic return eligibility calculation
- Courier pickup booking
- Refund transaction processing
- Exchange inventory reservation
- Return labels
- Return case management

Those operational features should be implemented as a separate **Returns Management System** phase. Policy content and real return cases should not be mixed into one collection.

## 4. End-to-End Architecture

```text
Admin → Returns & Exchanges Module
        ├── Page Settings
        ├── Return Conditions
        ├── Return Steps
        ├── Information Sections
        └── Support CTA
                    ↓
              Firestore collections
                    ↓
             GET /api/returns-policy
                    ↓
               /returns page
```

## 5. Firestore Data Model

### 5.1 Collection: `returns-policy`

Single settings document:

```text
returns-policy/settings
```

Example:

```json
{
  "id": "settings",
  "pageTitle": "RETURNS & EXCHANGES",
  "breadcrumbLabel": "Returns & Exchanges",
  "windowTitle": "30-Day Return Window",
  "windowDescription": "Not the right fit? Send it back within 30 days...",
  "conditionsHeading": "Return Conditions",
  "stepsHeading": "How to Return an Item",
  "active": true,
  "updatedAt": "2026-07-21T10:00:00.000Z"
}
```

### 5.2 Collection: `return-conditions`

Example:

```json
{
  "id": "condition-uuid",
  "text": "Item must be unworn, unwashed, and in original condition",
  "order": 1,
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 5.3 Collection: `return-steps`

Example:

```json
{
  "id": "step-uuid",
  "title": "Start your return",
  "description": "Go to Track Order and enter your order details...",
  "linkLabel": "Track Order",
  "linkPath": "/track-order",
  "order": 1,
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`linkLabel` and `linkPath` optional hon. Internal path validation required hogi.

### 5.4 Collection: `return-info-sections`

Refund Timeline aur Exchanges jaise reusable sections:

```json
{
  "id": "info-uuid",
  "title": "Refund Timeline",
  "description": "Cash on Delivery orders are refunded...",
  "order": 1,
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 5.5 Collection: `return-page-cta`

Single document:

```text
return-page-cta/support
```

```json
{
  "id": "support",
  "heading": "Still have questions?",
  "description": "Our support team is happy to help...",
  "buttonLabel": "CONTACT US",
  "buttonPath": "/contact",
  "active": true,
  "updatedAt": "..."
}
```

## 6. Shared Type Definitions

Recommended file:

```text
lib/returns-policy.ts
```

Types:

- `ReturnsPolicySettings`
- `ReturnCondition`
- `ReturnStep`
- `ReturnInfoSection`
- `ReturnSupportCta`
- `ReturnsPolicyPayload`

Admin, API and storefront same definitions reuse karenge.

## 7. API Design

Recommended public/admin endpoint:

```text
/api/returns-policy
```

### `GET /api/returns-policy`

Public response:

- Active page settings
- Active conditions
- Active steps
- Active info sections
- Active CTA
- All ordered correctly

### `GET /api/returns-policy?all=true`

- Admin authentication required
- Active and hidden records return hon

### Settings Mutations

```text
POST /api/returns-policy/settings
```

- Page headings and window card update
- Admin required

### Conditions CRUD

```text
POST   /api/returns-policy/conditions
PUT    /api/returns-policy/conditions
DELETE /api/returns-policy/conditions?id={id}
PATCH  /api/returns-policy/conditions/reorder
```

### Steps CRUD

```text
POST   /api/returns-policy/steps
PUT    /api/returns-policy/steps
DELETE /api/returns-policy/steps?id={id}
PATCH  /api/returns-policy/steps/reorder
```

### Information Sections CRUD

```text
POST   /api/returns-policy/info-sections
PUT    /api/returns-policy/info-sections
DELETE /api/returns-policy/info-sections?id={id}
PATCH  /api/returns-policy/info-sections/reorder
```

### CTA Settings

```text
POST /api/returns-policy/cta
```

### Initial Seed

```text
POST /api/returns-policy/seed
```

- Admin authentication required
- Only empty collections mein seed kare
- Repeat execution duplicates create na kare

## 8. API Response Format

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Return step saved."
}
```

Failure:

```json
{
  "success": false,
  "message": "Return step title is required."
}
```

All mutations consistent response format use karein.

## 9. Validation Rules

### Page Settings

- Page title: 3–100 characters
- Breadcrumb label: 2–60 characters
- Window title: 2–100 characters
- Window description: 2–1,000 characters
- Heading fields: 2–100 characters

### Condition

- Text required
- 2–500 characters
- Order non-negative whole number

### Return Step

- Title: 2–100 characters
- Description: 2–2,000 characters
- Optional link label: maximum 60 characters
- Optional link path must start with `/`
- `javascript:`, external or malformed paths reject hon
- Order non-negative whole number

### Information Section

- Title: 2–100 characters
- Description: 2–3,000 characters
- Order non-negative whole number

### CTA

- Heading: 2–100 characters
- Description: 2–1,000 characters
- Button label: 2–60 characters
- Button path must be a safe internal route

Server-side validation mandatory hogi.

## 10. Admin Sidebar Integration

Admin sidebar item:

```text
Returns & Exchanges
```

Recommended placement:

```text
FAQ Manager
Shipping Policy
Returns & Exchanges
Trust Benefits
```

Suggested Lucide icon:

- `RotateCcw`
- `Undo2`
- `PackageCheck`

Admin tab ID:

```text
returns-policy
```

Header:

```text
Returns & Exchanges
Manage return conditions, customer steps, refund details, and support content
```

## 11. Admin Module UI

Recommended component:

```text
components/admin/ReturnsPolicyModule.tsx
```

### Internal Navigation

- Page Settings
- Conditions
- Return Steps
- Information Sections
- Support CTA

### Page Settings Form

Fields:

- Page title
- Breadcrumb label
- Return-window title
- Return-window description
- Conditions heading
- Steps heading
- Page visibility

### Conditions Panel

- Condition text
- Active/Hidden
- Add/Edit/Delete
- Move Up/Down
- Order display

### Return Steps Panel

- Step title
- Step description
- Optional link label
- Optional internal link path
- Active/Hidden
- Add/Edit/Delete
- Move Up/Down

Step number user manually enter nahi karega. Storefront sorted order se automatically `1, 2, 3...` render karega.

### Information Sections Panel

- Section title
- Description
- Active/Hidden
- Add/Edit/Delete
- Move Up/Down

### Support CTA Panel

- Heading
- Description
- Button label
- Button link
- Active/Hidden

## 12. Reordering Strategy

Dedicated reorder endpoints complete ordered ID list receive karein.

API:

1. IDs validate kare
2. Missing/duplicate IDs reject kare
3. Firestore batch mein sequential `order` assign kare
4. Partial swaps avoid kare

This pattern current FAQ and Shipping Policy modules ke reliable reorder approach se aligned hogi.

## 13. Storefront `/returns` Integration

Hard-coded arrays and text remove honge.

Page load:

```text
GET /api/returns-policy
```

Rendering:

- Hero title from settings
- Breadcrumb label from settings
- Return-window card from settings
- Conditions ordered bullet list
- Return steps ordered numbered list
- Information sections ordered blocks
- CTA only when active

Existing styling and responsive layout preserve rahega.

### Safe Rendering

- Plain text render hoga
- `dangerouslySetInnerHTML` use nahi hoga
- New lines `whitespace-pre-line` se preserve ki ja sakti hain
- Optional internal links structured fields se render hon

## 14. Storefront States

### Loading

- Hero and breadcrumb visible
- Content area mein spinner/skeleton

### API Error

- Friendly error card
- Retry button
- Page crash nahi hogi

### Empty Policy

```text
Our returns policy is currently being updated. Please contact support for assistance.
```

### Hidden Page

Recommended behavior:

- Public endpoint `active: false` return kare
- Page support message show kare ya `notFound()` behavior use kare
- Recommended first version: friendly unavailable message plus Contact link

## 15. Initial Data Migration

Current content database mein seed hoga:

### Settings

- RETURNS & EXCHANGES
- 30-Day Return Window
- Existing window description
- Return Conditions
- How to Return an Item

### Conditions

- 5 existing conditions

### Steps

- Start your return
- Pack your item
- Hand it over for pickup
- Get your refund or exchange

### Information Sections

- Refund Timeline
- Exchanges

### CTA

- Still have questions?
- Existing support description
- CONTACT US → `/contact`

Seed verification:

- 1 settings document
- 5 conditions
- 4 steps
- 2 information sections
- 1 CTA document
- Second seed execution blocked without duplicates

## 16. Admin UX Requirements

- Loading and saving indicators
- Save buttons disabled during requests
- Existing admin authentication headers
- Success/error toast messages
- Delete confirmation
- Edit cancel action
- Forms reset after save
- Hidden badges clearly visible
- Character counters for long fields
- Empty collection seed button
- Refresh action
- Mobile-friendly forms and cards

## 17. Accessibility

- Labels associated with inputs
- Conditions remain semantic `<ul>`
- Steps remain semantic `<ol>`
- CTA link has descriptive accessible name
- Status not communicated by color only
- Loading/error messages use `aria-live`
- Buttons have accessible titles
- Keyboard controls supported

## 18. Security

- Public endpoint: active content read only
- `?all=true`: admin authorization required
- All mutations: admin authorization required
- Request payload allowlist
- Client timestamps not trusted
- Internal links validated
- Plain-text rendering prevents stored XSS
- Delete/reorder IDs validated against Firestore

Current project’s open sandbox Firestore rules production deployment se pehle server architecture ke saath securely migrate karni hongi.

## 19. Performance

- Settings and collections parallel fetch hon
- Small policy dataset client-side render ke liye appropriate hai
- Public response only active required fields return kare
- Data `order` ascending sort ho
- Optional future caching/revalidation policy add ho sakti hai

## 20. Files Expected to Change

### New Files

```text
lib/returns-policy.ts
components/admin/ReturnsPolicyModule.tsx
app/api/returns-policy/route.ts
app/api/returns-policy/settings/route.ts
app/api/returns-policy/conditions/route.ts
app/api/returns-policy/conditions/reorder/route.ts
app/api/returns-policy/steps/route.ts
app/api/returns-policy/steps/reorder/route.ts
app/api/returns-policy/info-sections/route.ts
app/api/returns-policy/info-sections/reorder/route.ts
app/api/returns-policy/cta/route.ts
app/api/returns-policy/seed/route.ts
```

### Existing Files

```text
app/returns/page.tsx
app/admin/page.tsx
```

## 21. Implementation Phases

### Phase 1 — Types and APIs

1. Shared types
2. Public combined GET
3. Settings API
4. Conditions CRUD/reorder
5. Steps CRUD/reorder
6. Info sections CRUD/reorder
7. CTA API
8. Validation and authorization

### Phase 2 — Migration

1. Idempotent seed endpoint
2. Existing content seed
3. Record counts and order verification

### Phase 3 — Admin Module

1. Sidebar integration
2. Internal tabs
3. Settings form
4. Conditions management
5. Steps management
6. Info sections management
7. CTA management
8. Toasts and empty states

### Phase 4 — Storefront

1. Remove hard-coded content
2. Fetch dynamic payload
3. Render settings and collections
4. Loading/error/empty states
5. Safe structured links
6. Responsive/accessibility verification

### Phase 5 — Verification

1. ESLint
2. TypeScript
3. Production build
4. API CRUD tests
5. Seed idempotency
6. Storefront desktop/mobile check
7. Hidden content verification
8. Reordering verification

## 22. Acceptance Criteria

- Admin sidebar mein Returns & Exchanges module visible ho
- Page title and return-window content editable ho
- Conditions fully manageable hon
- Return steps fully manageable hon
- Step numbers automatically order se generate hon
- Refund/exchange sections manageable hon
- CTA editable and hideable ho
- Hidden records storefront par show na hon
- Reorder immediately storefront par reflect ho
- Existing content successfully seed ho
- `/returns` mein no hard-coded policy arrays/text remain
- Loading, error, empty and retry states work karein
- Public content safe plain-text rendering use kare
- Production build pass ho

## 23. Test Checklist

### Settings

- [ ] Settings load/save
- [ ] Invalid lengths reject
- [ ] Page visibility works

### Conditions

- [ ] Add/edit/hide/delete
- [ ] Empty text reject
- [ ] Move Up/Down works
- [ ] Hidden condition storefront se removed

### Steps

- [ ] Add/edit/hide/delete
- [ ] Step numbering dynamic
- [ ] Safe internal link works
- [ ] External/javascript path rejected
- [ ] Reorder works atomically

### Info Sections

- [ ] Add/edit/hide/delete
- [ ] Reorder works
- [ ] Multiline text renders safely

### CTA

- [ ] Text and button update
- [ ] Internal path validation
- [ ] Hidden CTA removed from page

### Storefront and Migration

- [ ] 5 conditions seeded
- [ ] 4 steps seeded
- [ ] 2 info sections seeded
- [ ] CTA seeded
- [ ] Repeat seed blocked
- [ ] Loading/error/retry states
- [ ] Desktop/mobile layout
- [ ] Production build passes

## 24. Future Operational Returns System

Policy module complete hone ke baad separate project phase mein:

- Logged-in/guest return request
- Email + order ownership verification
- Return eligibility rules
- Eligible item and quantity selection
- Refund vs exchange selection
- Reason and image uploads
- Admin return-case workflow
- Courier pickup tracking
- Exchange inventory reservation
- Refund transaction status
- Return notifications and audit trail

Recommended collections:

```text
return-requests
return-request-items
return-events
return-notifications
```

## 25. Final Recommendation

First implement the **dynamic policy-content module** exactly within this plan, preserving the current storefront design. Actual return-request processing should remain a separate operational system so content management stays simple, safe and maintainable.
