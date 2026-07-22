# Professional Dynamic Order Tracking System — Complete Implementation Plan

## 1. Goal

`/track-order` ko secure, database-backed, professional tracking system banana hai:

- Guest customer ko checkout wali **email + Order/Tracking ID** dono match karne par hi order details milen.
- Logged-in customer ko verified Firebase UID ke through apni complete Order History mile.
- Admin real order status, courier aur tracking events manage kar sake.
- Customer ko database ke original checkout/order data aur real status history show ho.
- Direct client-side Firestore order lookup aur localStorage demo data tracking source na rahe.

## 2. Current-State Problems

Current implementation mein:

- Track Order form email/phone leta hai, lekin lookup mein sirf Order ID use hoti hai.
- `CartContext.trackOrder()` direct Firestore document read karta hai.
- Any guessed valid Order ID customer data expose kar sakti hai.
- Public Order ID six random digits par based hai aur easily enumerable ho sakta hai.
- Tracking sirf `statusIndex` aur static five steps par based hai.
- Status event timestamps/history available nahi.
- Order History ka kuch behavior localStorage/demo data par dependent hai.
- Guest orders aur later-created accounts ke darmiyan verified claim flow nahi.
- Courier, shipment tracking number aur delivery attempts ka structured model nahi.
- Firestore rules currently broad sandbox access allow karti hain.

## 3. Required User Flows

### 3.1 Guest Tracking

```text
Customer enters checkout email + Order/Tracking ID
        ↓
POST /api/orders/track
        ↓
Server normalizes and validates both values
        ↓
Order ID and normalized checkout email must both match
        ↓
Return customer-safe order DTO + visible tracking events
```

Mismatch response generic rahe:

```text
We couldn't find an order matching those details.
```

System ye reveal na kare ke email galat thi ya Order ID.

### 3.2 Logged-in Order History

```text
Firebase ID token
        ↓
Server verifies UID
        ↓
Query orders where ownerId == verified UID
        ↓
Return complete current + historical orders
```

Email-only ownership check allowed nahi hogi.

### 3.3 Logged-in Single Order Detail

Authenticated customer single order open kare to server verify kare:

```text
order.ownerId === verifiedUser.uid
```

### 3.4 Guest Order Claiming

Agar guest customer baad mein same email se account banaye:

1. Logged-in customer “Claim Guest Orders” select kare.
2. Server unclaimed orders ke normalized email matches detect kare.
3. Email OTP ya short-lived signed link send ho.
4. Verification successful hone par matching eligible orders ka `ownerId` attach ho.
5. Orders Order History mein appear hon.

Same email text match ke basis par automatic ownership transfer nahi hoga.

## 4. Order Data Model

Existing `orders` documents ko standardize karna hai.

```json
{
  "orderId": "CR-482913",
  "publicTrackingId": "CR-X7K4-P9QD-2M",
  "ownerId": "firebase-uid-or-null",
  "customer": {
    "name": "Customer Name",
    "email": "Customer@Example.com",
    "phone": "03001234567",
    "address": "Full shipping address",
    "city": "Karachi"
  },
  "customerEmailNormalized": "customer@example.com",
  "currentStatus": "shipped",
  "fulfillmentStatus": "shipped",
  "paymentStatus": "cod-pending",
  "paymentMethod": "cash-on-delivery",
  "estimatedDeliveryAt": "2026-07-27T00:00:00.000Z",
  "deliveredAt": null,
  "courier": {
    "name": "TCS",
    "trackingNumber": "TCS123456",
    "trackingUrl": "https://courier.example/track/..."
  },
  "subtotal": 100,
  "discountAmount": 10,
  "shippingCost": 5,
  "total": 95,
  "items": [],
  "createdAt": "2026-07-21T10:00:00.000Z",
  "updatedAt": "2026-07-22T15:30:00.000Z"
}
```

### Core Rules

- `orderId`: internal/business order number; existing ID preserve ho sakta hai.
- `publicTrackingId`: longer unpredictable public lookup identifier.
- `ownerId`: only verified Firebase UID or `null`.
- `customerEmailNormalized`: server-generated lowercase trimmed email.
- Monetary values checkout API server-side calculate kare.
- Current status canonical string ho; `statusIndex` temporary legacy compatibility ke liye rahe.
- Client-supplied status, owner ID, tracking ID or totals trust na hon.

## 5. Tracking Events Data Model

New collection:

```text
order-tracking-events
```

Example document:

```json
{
  "id": "event-uuid",
  "orderId": "CR-482913",
  "status": "shipped",
  "title": "Order Shipped",
  "description": "Your parcel has been handed to TCS.",
  "location": "Karachi Fulfillment Center",
  "occurredAt": "2026-07-22T15:30:00.000Z",
  "visibleToCustomer": true,
  "createdBy": "admin-firebase-uid",
  "createdAt": "2026-07-22T15:30:00.000Z"
}
```

Tracking events append-only audit records hon. Existing events silently overwrite/delete na hon; correction ke liye authorized audit-aware action use ho.

## 6. Canonical Statuses

Recommended normal flow:

1. `placed` — Order Placed
2. `confirmed` — Order Confirmed
3. `processing` — Processing
4. `packed` — Packed
5. `shipped` — Shipped
6. `in-transit` — In Transit
7. `out-for-delivery` — Out for Delivery
8. `delivered` — Delivered

Exceptional states:

- `confirmation-pending`
- `on-hold`
- `delivery-attempted`
- `cancelled`
- `return-requested`
- `returned`
- `refunded`

Allowed status-transition map server-side define ho. For example, delivered order normally processing par wapas na ja sake without elevated correction workflow.

## 7. Shared Types

Recommended file:

```text
lib/order-tracking.ts
```

Types:

- `OrderStatus`
- `PaymentStatus`
- `CourierSnapshot`
- `OrderTrackingEvent`
- `OrderDocument`
- `CustomerSafeTrackedOrder`
- `OrderHistorySummary`

Public DTO full Firestore order document return na kare.

## 8. Secure Tracking API

### `POST /api/orders/track`

Request:

```json
{
  "trackingId": "CR-X7K4-P9QD-2M",
  "email": "customer@example.com"
}
```

Server behavior:

1. Tracking ID uppercase/trim normalize kare.
2. Email lowercase/trim normalize and validate kare.
3. Tracking ID format validate kare.
4. Exact matching order load kare.
5. Timing-safe normalized-email comparison where practical.
6. Mismatch par generic 404 response.
7. Only customer-visible events load kare.
8. Customer-safe response return kare.
9. `Cache-Control: no-store` set kare.

Never return:

- `ownerId`
- full phone
- full street address unless authenticated business need
- internal admin notes
- hidden tracking events
- inventory or promotion internals

### Recommended Public Response

- Order/tracking ID
- Created date
- Current status
- Estimated delivery
- Courier name/tracking number/link
- Masked customer email
- Shipping city
- Items and quantities
- Price summary
- Customer-visible timeline
- Available customer actions

## 9. Authenticated Order APIs

### `GET /api/orders/history`

- Firebase bearer token required.
- Server token verify kare.
- Only `ownerId === uid` orders return kare.
- Order summaries created date descending return hon.
- Optional pagination cursor future-safe ho.

### `GET /api/orders/{orderId}`

- Auth required.
- Ownership server-side check.
- Complete customer-safe order detail + visible events.

### `POST /api/orders/claim/request`

- Auth required.
- Verified account email use kare.
- OTP/signed-link challenge create kare.
- Raw OTP database mein store na ho; hash + expiry store ho.

### `POST /api/orders/claim/verify`

- Auth required.
- OTP/token verify kare.
- Matching unclaimed guest orders transactionally attach kare.
- Audit record create kare.

## 10. Checkout Integration

`POST /api/checkout` order creation ke waqt:

- Valid email required and normalized ho.
- Server unique public tracking ID generate kare.
- Authenticated user ka `ownerId` verified token se derive ho.
- Client-requested owner ID trust na ho.
- Initial `placed` tracking event same transaction/batch mein create ho.
- `currentStatus`, `fulfillmentStatus`, `paymentStatus` initialize hon.
- Estimated delivery ISO timestamp mein store ho; localized display string runtime par generate ho.
- Customer-facing order confirmation response tracking ID return kare.

Order ID collision ke liye existence check/retry ya sufficiently random cryptographic ID use ho.

## 11. Track Order Page UI

### Lookup Form

Fields:

- Checkout Email Address
- Order / Tracking ID
- Track Order button

UX:

- Email type input
- Tracking ID auto uppercase
- Loading spinner and disabled submit
- Inline validation
- Generic lookup error
- Attempts ke baad cooldown message
- Logged-in user ko “View complete Order History” shortcut

URL may prefill only tracking ID:

```text
/track-order?order=CR-X7K4-P9QD-2M
```

Email URL query parameter mein include na ho.

### Result Header

- Tracking ID
- Current status badge
- Order date
- Estimated delivery
- Courier details

### Timeline

- Database event timestamps
- Status icon/title
- Description
- Location where available
- Current status highlight
- Desktop horizontal or event list
- Mobile vertical timeline

Static inferred “Completed/Pending” ke bajaye actual persisted events render hon.

### Order Details

- Items, images, size, color, quantity
- Subtotal
- Discount
- Shipping
- Total
- Payment method/status
- Masked contact data

### Actions

Eligibility ke mutabiq:

- Contact Support
- Download Invoice
- Cancel Order
- Request Return
- Reorder
- Courier Tracking Link

## 12. Logged-in Order History Page

Remove:

- Demo order creation
- localStorage as authoritative order history
- client-side email filtering as access control

Add:

- Authenticated server/API loading
- Active and Past tabs
- Status filters
- Search by order/tracking ID
- Created date and totals
- Expandable real tracking timeline
- Order detail page/link
- Pagination or Load More
- Empty/error/retry states
- Guest-order claim CTA

Firebase UID is the source of ownership.

## 13. Admin Fulfillment Integration

Existing Order Fulfillment module mein professional update form add ho:

- Current status
- Event title
- Customer-visible description
- Location
- Event date/time
- Estimated delivery date/time
- Courier name
- Courier tracking number
- Courier URL
- Customer visibility toggle
- Internal admin note separate field
- Notify customer checkbox

Save operation:

1. Admin auth verify
2. Order exists verify
3. Status transition validate
4. Order current fields update
5. Tracking event append
6. Audit record create
7. Optional email notification queue

Recommended endpoint:

```text
POST /api/admin/orders/{orderId}/tracking-events
```

## 14. Email Notifications

Email provider abstraction use ho so provider later change ho sake.

Templates:

- Order placed
- Order confirmed
- Shipped
- Out for delivery
- Delivered
- Delivery attempted
- Cancelled
- Return/refund update

Email includes:

- Customer name
- Order number
- Public tracking ID
- Current status summary
- Secure tracking page link with tracking ID only
- Support/contact link

Do not put customer email, phone, address or long-lived privileged token in URL.

Notification delivery records optional collection:

```text
order-notifications
```

Store status: queued, sent, failed, retry count, provider message ID and timestamps.

## 15. Security and Privacy

- Public tracking always email + unpredictable tracking ID match kare.
- Lookup only server API through ho.
- Direct public Firestore `orders` reads disabled hon.
- Admin writes admin authorization require karein.
- Logged-in history verified UID use kare.
- Generic mismatch response enumeration reduce kare.
- Rate limiting by IP + normalized tracking-ID fingerprint.
- Repeated failures temporary cooldown trigger karein.
- Public response customer-safe allowlist use kare.
- Logs raw email/address/phone avoid karein.
- Responses `no-store` hon.
- OTP short expiry, single-use and attempt-limited ho.
- Tracking and claim operations audit hon.

Current open Firestore sandbox rules production deployment se pehle restrict karna mandatory hai.

## 16. Rate Limiting

Recommended lookup policy example:

- 5 failed attempts per IP/tracking key per 10 minutes
- Progressive cooldown
- Successful lookup failure counter reset policy carefully define
- Server-side persistent/managed rate limit preferred

In-memory rate limiting serverless deployments mein reliable nahi; Firestore/Redis/provider-based solution use ho.

## 17. Customer-Safe Masking

Guest result example:

```text
d***@gmail.com
03*******67
Karachi
```

Full street address guest lookup result mein default show na ho. Logged-in detail page business requirement ke mutabiq full shipping address show kar sakti hai.

## 18. Migration Strategy

Existing orders migrate/backfill hon:

1. `customerEmailNormalized` from `customer.email`
2. `publicTrackingId` securely generate
3. `currentStatus` from legacy `statusIndex`
4. `fulfillmentStatus` initialize
5. `paymentStatus` initialize from payment method/order state
6. `estimatedDeliveryAt` derive where reliable; otherwise null
7. Initial historical event from created date
8. Current-state event from best available update timestamp

Migration script idempotent ho and existing valid values overwrite na kare.

Legacy `statusIndex` read compatibility temporarily rakhein, phir verified migration ke baad phase out karein.

## 19. Firestore Indexes

Likely indexes:

- `orders.ownerId + createdAt desc`
- `orders.publicTrackingId`
- `order-tracking-events.orderId + occurredAt asc`
- claim challenge `userId/emailHash + expiresAt`

Exact index requirements query implementation ke baad Firebase output se confirm hon.

## 20. Firestore Rules Target

High-level target:

- `orders`: no unauthenticated direct reads/writes
- authenticated customer direct read only if `ownerId == request.auth.uid`, or preferably all access via server API
- `order-tracking-events`: no public direct access
- admin-only mutations
- checkout/order creation server-controlled
- claim challenges never public

Client SDK use karne wali existing architecture ke saath rules carefully stage/test karni hongi.

## 21. Reliability and Transactions

- Checkout order + first event consistent write ho.
- Admin status update + event write transaction/batch ho.
- Claiming multiple orders transaction/batched safely ho.
- Email sending database transaction ke andar external network call na kare; queue after commit.
- Partial failure retry-safe ho.
- Idempotency key duplicate checkout/status submissions prevent kare.

## 22. Accessibility

- Form labels correctly associated
- Errors `aria-live`
- Timeline semantic ordered list
- Status text color ke baghair understandable
- Loading and disabled states announced
- Buttons keyboard accessible
- Courier external link descriptive label use kare

## 23. Files Expected to Change

### New Files

```text
lib/order-tracking.ts
lib/server/orders.ts
app/api/orders/track/route.ts
app/api/orders/history/route.ts
app/api/orders/[orderId]/route.ts
app/api/orders/claim/request/route.ts
app/api/orders/claim/verify/route.ts
app/api/admin/orders/[orderId]/tracking-events/route.ts
components/OrderTrackingTimeline.tsx
components/OrderSummaryDetails.tsx
```

Optional migration/notification files:

```text
scripts/migrate-order-tracking.ts
lib/server/order-notifications.ts
```

### Existing Files

```text
app/track-order/page.tsx
app/order-history/page.tsx
app/checkout/page.tsx
app/api/checkout/route.ts
app/admin/page.tsx
context/CartContext.tsx
types/commerce.ts
firestore.rules
```

## 24. Implementation Phases

### Phase 1 — Model and Secure Lookup

1. Shared order/tracking types
2. Normalization and public DTO helpers
3. Secure email + tracking ID API
4. Rate-limit abstraction
5. Track Order form API integration
6. Direct Firestore lookup removal

### Phase 2 — Real Tracking Events

1. Event collection and types
2. Checkout initial event
3. Timeline API response
4. Dynamic timeline UI
5. Legacy status compatibility

### Phase 3 — Admin Fulfillment

1. Admin tracking-event API
2. Status transition validation
3. Courier fields
4. Estimated delivery controls
5. Audit trail
6. Customer visibility controls

### Phase 4 — Authenticated Order History

1. Secure history API
2. UID ownership checks
3. Remove demo/localStorage authority
4. Active/Past filtering
5. Order detail/timeline

### Phase 5 — Guest Claim and Notifications

1. OTP/signed-link provider
2. Claim request/verify APIs
3. Account UI
4. Email templates and delivery queue
5. Notification retries/logs

### Phase 6 — Migration and Hardening

1. Existing order backfill
2. Indexes
3. Firestore rules
4. Rate-limit verification
5. Privacy/security tests
6. Remove legacy fields after verification

## 25. Acceptance Criteria

- Guest cannot retrieve an order with Order ID alone.
- Wrong email + correct ID returns no details.
- Correct checkout email + correct tracking ID returns the right safe details.
- Logged-in history only returns verified UID-owned orders.
- Guest orders do not auto-attach by typed email alone.
- Admin can append real timestamped tracking events.
- Timeline renders database events in correct order.
- Hidden/internal events never show publicly.
- Courier and estimated delivery data render when available.
- Checkout creates normalized email, public tracking ID and initial event.
- Direct unauthenticated Firestore order reads are blocked in production.
- Demo/localStorage orders are not treated as original history.
- APIs return generic privacy-safe errors.
- Mobile and desktop tracking UI work.
- Production build and security tests pass.

## 26. Test Checklist

### Guest Lookup

- [ ] Correct ID + correct email succeeds
- [ ] Correct ID + wrong email fails generically
- [ ] Wrong ID + correct email fails generically
- [ ] Case/whitespace-normalized email succeeds
- [ ] Invalid email/ID format rejected
- [ ] Rate limit/cooldown works
- [ ] Response excludes owner ID, full phone, full address and admin notes

### Logged-in History

- [ ] Only UID-owned orders returned
- [ ] Another user's order cannot be opened
- [ ] Logged-out history endpoint returns 401
- [ ] Active/Past filters work
- [ ] Empty/error/retry states work

### Tracking Events

- [ ] Initial placed event created at checkout
- [ ] Admin valid transition succeeds
- [ ] Invalid transition rejected
- [ ] Event order uses occurredAt
- [ ] Hidden event excluded publicly
- [ ] Current status and timeline stay consistent

### Claim Flow

- [ ] Same email alone does not claim orders
- [ ] Correct OTP attaches eligible guest orders
- [ ] Expired/reused/wrong OTP fails
- [ ] Orders owned by another UID never transfer
- [ ] Claim operation audited

### Reliability and Security

- [ ] Duplicate submit is idempotent
- [ ] Direct Firestore public order read blocked
- [ ] Sensitive data absent from logs and URL
- [ ] Migration repeat creates no duplicate IDs/events
- [ ] Existing checkout pricing/inventory transaction remains correct
- [ ] `npm run build` passes

## 27. Final Recommended Build Decision

Implement server-verified guest tracking with **checkout email + unpredictable public tracking ID**, Firebase UID-based authenticated Order History, append-only database tracking events, admin-controlled fulfillment updates, privacy-safe response DTOs, and a verified guest-order claim flow.

Ye structure original database data ko single source of truth banata hai aur customer privacy, professional tracking experience aur future courier/email integrations ke liye correct foundation deta hai.
