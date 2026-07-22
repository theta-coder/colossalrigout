# Dynamic Newsletter and First-Order Discount Plan

## 1. Objective

Current newsletter block ko real database-backed system banana hai:

```text
GET 10% OFF YOUR FIRST ORDER
Subscribe to our newsletter for exclusive offers and new arrivals.
[ Enter your email ] [ SUBSCRIBE ]
```

Final system mein:

- email actually database mein save hogi;
- duplicate subscriptions safely handle hongi;
- email ownership verify hogi;
- marketing consent and unsubscribe support hoga;
- discount sirf eligible first order par milega;
- same customer discount dobara use nahi kar sakega;
- homepage aur product page same reusable component/API use karenge;
- heading, description, button text, discount value and active status admin se change honge;
- checkout final eligibility server-side transaction mein verify karega;
- fake public `WELCOME10` alert remove hoga.

## 2. Current Project Audit

Current implementation real subscription nahi hai:

- `app/page.tsx` form sirf alert show karta hai;
- alert public generic `WELCOME10` code expose karta hai;
- `app/product/page.tsx` ka second form bhi sirf alert show karta hai;
- submitted email kahin save nahi hoti;
- email verification nahi hoti;
- subscriber list/admin module nahi hai;
- unsubscribe workflow nahi hai;
- first-order eligibility checkout par newsletter subscription ke against verify nahi hoti;
- homepage aur product page par duplicate static JSX hai;
- existing `promotions` engine usage limits support karta hai, lekin newsletter eligibility se connected nahi hai.

## 3. Recommended Business Flow

### Recommended secure flow

1. Visitor email enter karta hai.
2. Backend email normalize aur validate karta hai.
3. Subscriber document `pending-verification` status mein create/update hota hai.
4. Verification email secure one-time link ke saath send hoti hai.
5. Customer link click karta hai.
6. Subscriber `active` hota hai.
7. System newsletter campaign ke against one-time discount entitlement create karta hai.
8. Customer same verified email se login/signup karta hai.
9. Cart/checkout entitlement display karta hai.
10. Checkout server confirm karta hai:
   - logged-in user email subscribed email se match karti hai;
   - email verified hai;
   - customer ka pehle successful/placed order nahi hai;
   - entitlement unused and unexpired hai;
   - promotion active hai.
11. Order aur entitlement redemption same Firestore transaction mein save hote hain.
12. Parallel checkout request bhi same entitlement twice redeem nahi kar sakti.

### Why generic `WELCOME10` code recommended nahi hai

Public shared coupon:

- internet par easily share ho jata hai;
- non-subscribers use kar sakte hain;
- guest identity reliably track nahi hoti;
- multiple accounts/emails se abuse easy hota hai;
- newsletter consent aur discount usage connect nahi hotay.

Recommended model: **verified subscriber entitlement**. UI mein optional friendly code display ho sakta hai, lekin checkout authorization entitlement document se hogi—not code alone.

## 4. First Order Definition

Business rule explicitly define karna zaroori hai.

Recommended definition:

- first order means user ke account/email ke against koi previous non-cancelled order nahi;
- `placed`, `processing`, `shipped`, `delivered` orders customer ko existing customer count karenge;
- `cancelled` or failed checkout optionally count nahi karega;
- Cash on Delivery order place hote hi first-order entitlement consume hoga;
- order later cancelled ho to entitlement automatically restore nahi hoga unless admin manually restores it;
- guest checkout par newsletter discount unavailable ho; customer ko verified email account se login required ho.

Login requirement identity and one-use enforcement ko reliable banati hai.

## 5. Firestore Database Design

### 5.1 `newsletter-campaigns/{campaignId}`

Admin-manageable UI and offer configuration:

```ts
{
  id: string;
  internalName: string;                 // Welcome Newsletter 2026
  heading: string;                      // GET 10% OFF YOUR FIRST ORDER
  description: string;
  emailPlaceholder: string;
  buttonText: string;
  successMessage: string;
  alreadySubscribedMessage: string;

  promotionId: string;                  // promotions/{promotionId}
  discountLabel: string;                // derived/display snapshot
  requireEmailVerification: boolean;
  requireLoginAtCheckout: boolean;
  entitlementValidityDays: number;      // e.g. 30

  placement: {
    homepage: boolean;
    productPage: boolean;
  };

  consentText: string;
  privacyPath: string;                  // validated internal route
  startsAt: string;
  endsAt: string;
  status: 'draft' | 'active' | 'inactive';
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

Newsletter campaign timer display/scheduling manage karega. Actual discount rules existing `promotions/{promotionId}` document manage karega. Dono concerns separate rahenge.

### 5.2 `newsletter-subscribers/{normalizedEmailHash}`

Raw email ko document ID nahi banana. SHA-256 normalized email hash recommended hai.

```ts
{
  id: string;                            // email hash
  email: string;                         // normalized lower-case email
  userId: string | null;
  status: 'pending-verification' | 'active' | 'unsubscribed' | 'bounced' | 'complained';

  consent: true;
  consentTextSnapshot: string;
  consentedAt: string;
  source: 'homepage' | 'product-page' | 'checkout' | 'admin-import';
  sourcePath: string;

  verificationTokenHash: string | null;
  verificationExpiresAt: string | null;
  verifiedAt: string | null;
  unsubscribedAt: string | null;

  subscribedCampaignIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

Security:

- public responses email existence reveal na karein;
- verification token plaintext database mein store na ho;
- raw email public API/list mein expose na ho;
- client subscriber status directly update na kar sake.

### 5.3 `newsletter-entitlements/{entitlementId}`

```ts
{
  id: string;
  subscriberId: string;
  campaignId: string;
  promotionId: string;
  userId: string | null;
  email: string;

  status: 'available' | 'redeemed' | 'expired' | 'revoked';
  firstOrderOnly: true;
  validFrom: string;
  validUntil: string;

  redeemedOrderId: string | null;
  redeemedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Unique deterministic ID recommended:

```text
{campaignId}_{subscriberId}
```

Is se same email ko same campaign entitlement duplicate create nahi hoga.

### 5.4 `newsletter-events/{eventId}`

Audit/analytics:

```ts
{
  id: string;
  subscriberId: string;
  campaignId: string;
  type: 'submitted' | 'verification-sent' | 'verified' | 'resubscribed' |
        'unsubscribed' | 'entitlement-created' | 'discount-redeemed' |
        'email-bounced' | 'email-complained';
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}
```

Sensitive token/email details event metadata mein store nahi honge.

### 5.5 Existing `promotions/{promotionId}`

Newsletter campaign selected existing promotion se link hogi:

```ts
{
  applicationMode: 'automatic';
  discountType: 'percentage';
  discountValue: 10;
  targetType: 'all-products';
  loginRequired: true;
  maxUsesPerUser: 1;
  globalUsageLimit: null;
  startsAt: string;
  endsAt: string;
  status: 'active';
}
```

Additional recommended eligibility metadata:

```ts
{
  eligibilityType: 'newsletter-first-order';
  newsletterCampaignId: string;
}
```

Promotion module discount calculate karega; newsletter entitlement decide karega customer is promotion ko use kar sakta hai ya nahi.

## 6. API Design

### 6.1 `GET /api/newsletter/campaign?placement=homepage`

Public active campaign configuration return kare:

- placement match;
- active status;
- current time schedule ke andar;
- public text fields only;
- promotion private usage information expose na kare.

Zero active campaign ho to `{ success: true, data: null }`; frontend complete section hide kare.

### 6.2 `POST /api/newsletter/subscribe`

Request:

```ts
{
  email: string;
  campaignId: string;
  consent: true;
  source: 'homepage' | 'product-page';
}
```

Backend:

1. email normalize/validate;
2. active campaign verify;
3. consent required;
4. rate limit;
5. hashed subscriber lookup;
6. duplicate/resubscribe state safely handle;
7. cryptographically secure verification token generate;
8. token hash database mein store;
9. verification email provider ko send;
10. generic response return.

Security response:

```text
If this email can be subscribed, a verification message has been sent.
```

Same response existing/non-existing email ke liye email enumeration prevent karti hai.

### 6.3 `GET /api/newsletter/verify?token=...`

- token hash lookup;
- expiry and one-time validity check;
- subscriber active set;
- entitlement idempotently create;
- token invalidate;
- confirmation page/login return path redirect.

### 6.4 `POST /api/newsletter/resend-verification`

- rate limited;
- old token invalidate;
- new secure token/email;
- generic response.

### 6.5 `POST /api/newsletter/unsubscribe`

Unsubscribe email link signed token use kare:

- subscriber `unsubscribed` status;
- marketing emails stop;
- audit event;
- existing legal entitlement retain/revoke business decision campaign config ke mutabiq.

One-click unsubscribe email headers support recommended hai.

### 6.6 `GET /api/newsletter/entitlement`

Authenticated customer endpoint:

- Firebase ID token verify;
- verified user email match;
- available/unexpired first-order entitlement return;
- checkout UI ko offer message provide kare;
- response authorization nahi—checkout dobara transactional verification karega.

### 6.7 Admin endpoints

```text
GET    /api/admin/newsletter/campaigns
POST   /api/admin/newsletter/campaigns
PUT    /api/admin/newsletter/campaigns/{id}
DELETE /api/admin/newsletter/campaigns/{id}
GET    /api/admin/newsletter/subscribers
GET    /api/admin/newsletter/stats
POST   /api/admin/newsletter/entitlements/{id}/revoke
POST   /api/admin/newsletter/entitlements/{id}/restore
```

All endpoints `requireAdmin()` and authenticated `adminApiFetch()` use karein.

## 7. Email Delivery Provider

Firebase/Firestore email automatically send nahi karta. Transactional email provider required hoga, for example:

- Resend;
- SendGrid;
- Postmark;
- Firebase Trigger Email extension.

Recommended abstraction:

`lib/server/email.ts`

```ts
sendNewsletterVerification({ email, verificationUrl, campaign })
sendNewsletterWelcome({ email, offerSummary, accountUrl })
```

Provider API key sirf server environment variable mein hogi. Client bundle ya Firestore document mein nahi.

Development mode mein email send karne ke bajaye verification URL server console/dev response mein restricted admin-only mode se inspect ki ja sakti hai.

## 8. Checkout Integration

Checkout is system ka most important enforcement point hai.

### Cart display

- authenticated eligible user ko “10% first-order subscriber offer available” show ho;
- guest subscriber ko login/create-account CTA;
- UI preview informational ho;
- price calculation `/api/promotions/apply` entitlement-aware ho.

### Final checkout transaction

`app/api/checkout/route.ts` transaction mein:

1. Firebase user token verify;
2. user email Auth profile se read;
3. matching subscriber active/verified check;
4. entitlement document transactionally read;
5. entitlement status `available` and date valid check;
6. previous non-cancelled orders user ID and normalized email ke against check;
7. linked promotion active and scheduled check;
8. eligible product rules calculate;
9. discount calculate and maximum/minimum rules apply;
10. order write;
11. entitlement `redeemed` update;
12. `promotion-redemptions` and `promotion-user-usage` update;
13. newsletter event write.

All writes same transaction mein hon taake two tabs/two requests one entitlement twice use na kar saken.

Order snapshot:

```ts
{
  newsletterEntitlementId: string | null;
  promotionId: string | null;
  discountAmount: number;
  discountSnapshot: {
    source: 'newsletter-first-order';
    campaignId: string;
    type: string;
    value: number;
  } | null;
}
```

## 9. Admin Module

Admin sidebar mein **Newsletter & First Order** module add hoga.

### Campaign editor

- internal name;
- heading;
- description;
- email placeholder;
- subscribe button text;
- success/already subscribed messages;
- existing Promotions dropdown;
- entitlement validity days;
- homepage/product-page placement toggles;
- verification required;
- consent text/privacy page;
- start/end dates;
- draft/active/inactive;
- preview.

Admin discount manually duplicate configure nahi karega. Existing Promotions module se promotion select karega, isliye price rules one source of truth rahenge.

### Subscriber management

- total subscribers;
- pending verification;
- active;
- unsubscribed;
- bounced/complained;
- date/source filters;
- masked email list by default;
- search permission limited;
- CSV export only authorized admin and audit logged;
- no plaintext verification tokens.

### Performance report

- form submissions;
- verification rate;
- active subscribers;
- entitlements created;
- first-order discounts redeemed;
- revenue/orders attributed;
- unsubscribe rate;
- bounce/complaint rate.

## 10. Frontend Component

Duplicate homepage/product-page JSX remove karke reusable component:

`components/NewsletterSignup.tsx`

Props:

```ts
{
  placement: 'homepage' | 'product-page';
}
```

Component states:

- loading campaign;
- ready;
- submitting;
- verification sent;
- already subscribed generic message;
- validation error;
- inactive/no campaign → render nothing.

Frontend behaviour:

- email controlled input;
- explicit consent checkbox/text;
- double-click prevention;
- accessible label and status messages;
- no `alert()`;
- server error inline show;
- successful request ke baad input clear;
- responsive existing design retain;
- active campaign text database se aaye.

## 10.1 Bulk Promotional Email System

Newsletter subscribers collect karna half system hai. Future mein sab ya selected customers ko promotion email bhejne ke liye separate **Email Campaigns** system chahiye.

### Bulk send ka simple flow

1. Admin `Email Campaigns` module open karega.
2. Existing template select karega ya subject/content compose karega.
3. Audience choose karega:
   - all active subscribers;
   - never purchased;
   - existing customers;
   - first-order entitlement unused;
   - category/collection buyers;
   - city/source/date segment;
   - custom saved segment.
4. System suppressed recipients remove karega:
   - unsubscribed;
   - bounced;
   - spam complaint;
   - invalid email.
5. Admin recipient count and sample preview dekhega.
6. Admin test email apne address par bhejega.
7. Admin `Send Now` ya scheduled date/time select karega.
8. Provider Broadcast/Marketing Campaign API campaign queue karegi.
9. Provider individually emails deliver karega—one giant BCC email nahi.
10. Delivery webhooks sent/delivered/bounced/clicked/unsubscribed events database mein update karenge.

Frontend browser subscribers loop karke emails nahi bhejega. API keys browser mein nahi hongi. Bulk campaign trusted backend/provider se send hogi.

### Recommended provider approach

For this project, provider-native audience/broadcast system easiest and safest hai:

- **Resend**: Contacts/Audiences, Segments and Broadcasts;
- **SendGrid Marketing Campaigns**: Contacts, Lists, dynamic Segments, Single Sends and Automations;
- **Firebase Trigger Email Extension**: Firestore mail documents ko SMTP ke through send kar sakti hai, but complete marketing audience/segment/campaign UI khud build karna padega.

Recommended starting choice:

- small/medium custom Next.js + Firebase system: Resend Broadcasts;
- advanced segmentation/large marketing operations: SendGrid Marketing Campaigns;
- Firebase-only transactional emails: Trigger Email extension plus SMTP provider.

Final provider configuration pricing, expected subscriber count and sending volume dekh kar choose hogi. Application provider adapter use karegi taake future migration possible ho.

## 10.2 Additional Firestore Collections for Bulk Email

### `email-templates/{templateId}`

```ts
{
  id: string;
  internalName: string;
  category: 'promotion' | 'new-arrival' | 'back-in-stock' | 'seasonal' |
            'store-event' | 'abandoned-cart' | 'transactional';
  subject: string;
  previewText: string;
  heading: string;
  bodyBlocks: Array<{
    id: string;
    type: 'text' | 'image' | 'button' | 'products' | 'divider';
    content: Record<string, unknown>;
  }>;
  htmlSnapshot: string;
  textSnapshot: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Admin arbitrary unsafe HTML directly enter na kare. Controlled blocks/templates recommended hain. Every email mein physical/business identity and unsubscribe link automatically insert hon.

### `email-segments/{segmentId}`

```ts
{
  id: string;
  name: string;
  rules: Array<{
    field: 'subscriberStatus' | 'source' | 'subscribedAt' | 'orderCount' |
           'lastOrderAt' | 'city' | 'purchasedCategory' | 'entitlementStatus';
    operator: 'equals' | 'not-equals' | 'before' | 'after' | 'contains' | 'greater-than';
    value: string | number | boolean;
  }>;
  match: 'all' | 'any';
  providerSegmentId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Initial release ke safe built-in segments:

- All Active Subscribers;
- Subscribers Without Orders;
- Customers With Orders;
- Unused Welcome Discount;
- New Subscribers Last 30 Days;
- Inactive Customers Last 90 Days.

### `email-campaigns/{emailCampaignId}`

```ts
{
  id: string;
  internalName: string;
  templateId: string;
  subject: string;
  previewText: string;

  audienceType: 'all-active' | 'segment';
  segmentId: string | null;
  promotionId: string | null;
  collectionId: string | null;
  productIds: string[];

  scheduledAt: string | null;
  timezone: string;
  status: 'draft' | 'scheduled' | 'queueing' | 'sending' |
          'sent' | 'paused' | 'cancelled' | 'failed';

  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;

  provider: 'resend' | 'sendgrid' | 'firebase-trigger-email';
  providerCampaignId: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### `email-campaign-recipients/{campaignId_subscriberId}`

Large subscriber count par every recipient snapshot useful hai:

```ts
{
  campaignId: string;
  subscriberId: string;
  providerMessageId: string | null;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' |
          'unsubscribed' | 'suppressed' | 'failed';
  sentAt: string | null;
  deliveredAt: string | null;
  lastEventAt: string | null;
  errorCode: string | null;
}
```

Small system/provider-native Broadcasts use karte waqt full recipient documents optional hain. Provider analytics source of truth aur Firestore aggregate stats cache ban sakti hain.

### `email-provider-events/{providerEventId}`

Webhook idempotency/audit:

```ts
{
  id: string;
  provider: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' |
        'complained' | 'unsubscribed' | 'failed';
  campaignId: string | null;
  subscriberId: string | null;
  providerMessageId: string | null;
  occurredAt: string;
  processedAt: string;
}
```

Raw webhook body permanently store na karna unless required; private payload sanitize karein.

## 10.3 Email Campaign Admin Modules

Newsletter admin area ko following submodules/tabs chahiye:

### A. Subscribers

- active/pending/unsubscribed/bounced/complained;
- source/date filters;
- search;
- consent history;
- entitlement state;
- manual suppression;
- permission-controlled CSV export.

### B. Templates

- subject and preview text;
- heading/body/button;
- imported banner image or linked products;
- desktop/mobile email preview;
- test email;
- duplicate template;
- version/snapshot.

### C. Segments

- built-in segments;
- rule builder;
- live estimated recipient count;
- excluded/suppressed count;
- sample recipients;
- provider segment synchronization state.

### D. Campaigns

- template selection;
- audience/segment selection;
- optional promotion/product/collection linking;
- send now/schedule;
- timezone;
- test send;
- final confirmation with recipient count;
- prevent editing after sending;
- cancel scheduled campaign;
- campaign analytics.

### E. Automations

- welcome verification;
- welcome/first-order reward;
- new subscriber sequence;
- abandoned cart;
- back in stock;
- post-purchase follow-up;
- win-back campaign;
- product review request.

Each automation active/inactive, delay, template and frequency controls rakhegi.

## 10.4 Event and Automation Service

“Event service” customer action ko record karke relevant automated email trigger karti hai.

Recommended internal event names:

```text
newsletter.submitted
newsletter.verified
newsletter.unsubscribed
user.registered
cart.updated
cart.abandoned
product.back_in_stock
promotion.started
collection.published
order.placed
order.shipped
order.delivered
review.request_due
email.delivered
email.opened
email.clicked
email.bounced
email.complained
```

Recommended architecture:

```text
App/API action
   → domain event document / queue
   → event worker
   → automation rule evaluation
   → email job
   → provider
   → provider webhook
   → delivery/event status update
```

### Scheduling and queue choices

Firebase environment mein recommended services:

- Firebase/Google Cloud Functions for event workers;
- Cloud Tasks for retryable per-recipient jobs;
- Cloud Scheduler for scheduled campaign release and abandoned-cart scans;
- Pub/Sub for high-volume domain events;
- provider-native Broadcast scheduling for normal marketing campaigns.

First implementation mein provider-native Broadcast scheduling use karna simpler hai. Application contacts, campaign content and schedule provider ko send kare; provider bulk delivery, throttling and suppression handle kare.

Custom per-recipient sending required ho to Cloud Tasks batches use hon:

- recipients snapshot once;
- 100–500 jobs/batch according to provider limit;
- exponential retry;
- idempotency key `{campaignId}_{subscriberId}`;
- permanent bounce/complaint retry na ho;
- campaign pause/cancel flag every worker check kare.

Next.js request ko thousands of emails complete hone tak open nahi rakhna.

## 10.5 Bulk Promotion Example

Suppose admin sab active subscribers ko “Summer Sale 20% Off” bhejna chahta hai:

1. Promotions module mein real Summer Sale promotion create kare.
2. Email Templates mein Summer Sale template create kare.
3. Campaigns → New Campaign.
4. Template select kare.
5. Promotion select kare; CTA automatically safe `/shop?promotion=...` generate ho.
6. Audience `All Active Subscribers` select kare.
7. System shows:

```text
Active subscribers: 5,200
Unsubscribed excluded: 210
Bounced/complained excluded: 47
Final recipients: 4,943
```

8. Admin test email send kare.
9. Admin schedule or send now confirm kare.
10. Backend/provider broadcast create kare.
11. Provider 4,943 individual emails send kare.
12. Every email personalized unsubscribe link contain kare.
13. Webhooks delivery/bounce/click events update karein.
14. Admin dashboard delivered/clicked/orders/revenue report show kare.

One email ke `To`/`CC`/`BCC` mein 4,943 addresses kabhi add nahi karne. Privacy, deliverability and provider limits ke liye every recipient provider-managed individual delivery hogi.

## 10.6 Provider Synchronization

Firestore business/audit source of truth rahegi, provider delivery source of truth hoga.

On subscriber verify/update:

```text
Firestore subscriber update
→ provider contact upsert
→ correct audience/segment membership
```

On unsubscribe/bounce/complaint webhook:

```text
Provider event
→ verified webhook endpoint
→ Firestore subscriber suppression status
→ future campaigns automatically exclude
```

Webhook endpoint:

`POST /api/webhooks/email/{provider}`

Must:

- provider signature verify;
- replay/idempotency check;
- fast acknowledgement;
- heavy processing queue mein;
- secret environment variable use;
- unknown event safely ignore/log.

## 10.7 Deliverability Setup

Bulk email start karne se pehle:

- dedicated sending domain/subdomain, e.g. `mail.colossalrigout.pk`;
- SPF record;
- DKIM records;
- DMARC policy;
- verified `From` identity;
- valid reply-to/support address;
- gradual domain/IP warm-up;
- bounce and complaint monitoring;
- plain text alternative;
- unsubscribe headers/link;
- image size optimization;
- spammy subject/content avoid;
- purchased email lists never use.

Provider API technically email send kar sakta hai, lekin domain authentication ke baghair inbox placement poor ho sakti hai.

## 10.8 Additional Bulk Email APIs

```text
GET    /api/admin/email/templates
POST   /api/admin/email/templates
PUT    /api/admin/email/templates/{id}
DELETE /api/admin/email/templates/{id}

GET    /api/admin/email/segments
POST   /api/admin/email/segments
POST   /api/admin/email/segments/{id}/estimate

GET    /api/admin/email/campaigns
POST   /api/admin/email/campaigns
PUT    /api/admin/email/campaigns/{id}
POST   /api/admin/email/campaigns/{id}/test
POST   /api/admin/email/campaigns/{id}/schedule
POST   /api/admin/email/campaigns/{id}/send
POST   /api/admin/email/campaigns/{id}/cancel
GET    /api/admin/email/campaigns/{id}/analytics

POST   /api/webhooks/email/resend
POST   /api/webhooks/email/sendgrid
```

Send endpoint:

- admin permission;
- campaign draft state;
- test send completed recommended;
- recipient estimate confirmation;
- idempotency key;
- immutable send snapshot;
- background/provider job creation;
- immediate `202 Accepted`, not long-running HTTP request.

## 11. Authentication and Email Matching

Recommended:

- subscription login ke baghair allowed;
- redemption ke liye login required;
- Firebase Auth email verified honi chahiye;
- account email subscriber verified email exactly normalized match kare;
- request body `userId`/email checkout authorization ke liye trust na ho;
- server Firebase ID token identity use kare.

If customer different email account use karta hai, entitlement claim flow with both emails verification required hoga. Initial version mein same-email login simpler and safer hai.

## 12. Validation and Abuse Protection

- trim and lowercase email;
- proper email syntax and maximum length;
- disposable email blocking optional;
- subscribe IP/email rate limits;
- CAPTCHA after suspicious attempts;
- verification token high entropy and short expiry (e.g. 24 hours);
- token hash only;
- generic API responses;
- one entitlement per campaign/email;
- one redemption per entitlement;
- first-order query plus transaction check;
- marketing consent timestamp/text snapshot;
- bounce/complaint suppression;
- logs mein raw email/token avoid.

## 13. Privacy and Compliance

- consent checkbox pre-checked na ho;
- privacy policy link visible;
- why email collected clearly stated;
- unsubscribe every marketing email mein;
- unsubscribe immediate;
- data export/deletion workflow;
- retention policy;
- provider suppression list respect;
- Pakistan/international target markets ke applicable privacy/marketing laws deployment se pehle confirm karne honge.

## 14. Firestore Indexes

Recommended:

```text
newsletter-subscribers: status ASC, createdAt DESC
newsletter-subscribers: source ASC, createdAt DESC
newsletter-entitlements: userId ASC, status ASC, validUntil DESC
newsletter-entitlements: subscriberId ASC, campaignId ASC
newsletter-events: campaignId ASC, createdAt DESC
newsletter-events: type ASC, createdAt DESC
orders: ownerId ASC, createdAt DESC
orders: customer.normalizedEmail ASC, createdAt DESC
```

## 15. Firestore Rules and Server Architecture

Production:

- newsletter collections direct public client read/write allow na karein;
- public signup API server-side write kare;
- admin APIs admin-only;
- raw subscriber email public endpoint se list na ho;
- entitlement client directly redeem/update na kar sake;
- promotion/order fields customer directly change na kar sake.

Current project Firebase client SDK server routes aur sandbox-open rules use karta hai. Production rules lock karne se pehle Firebase Admin SDK/service credentials integrate karna required hai.

## 16. Static Removal and Migration

1. homepage static newsletter form JSX remove;
2. product page duplicate form remove;
3. fake `alert()` logic remove;
4. public `WELCOME10` message remove;
5. shared `NewsletterSignup` component attach;
6. default newsletter campaign seed;
7. linked real 10% promotion create/select;
8. admin module/sidebar attach;
9. subscriber, verification and entitlement APIs attach;
10. checkout transactional enforcement attach.

## 17. Recommended Default Campaign

```ts
{
  internalName: 'Welcome First Order Offer',
  heading: 'GET 10% OFF YOUR FIRST ORDER',
  description: 'Subscribe to our newsletter for exclusive offers and new arrivals.',
  emailPlaceholder: 'Enter your email',
  buttonText: 'SUBSCRIBE',
  successMessage: 'Check your inbox to verify your email and unlock your first-order offer.',
  requireEmailVerification: true,
  requireLoginAtCheckout: true,
  entitlementValidityDays: 30,
  placement: { homepage: true, productPage: true },
  status: 'active'
}
```

Linked promotion:

- 10% percentage discount;
- all products initially;
- maximum discount optional;
- minimum order configurable;
- login required;
- one use per user;
- non-stackable;
- eligibility type `newsletter-first-order`.

## 18. Implementation Phases

### Phase 1 — Data and backend

1. Firestore types/collections;
2. campaign public endpoint;
3. subscribe and verification endpoints;
4. email provider abstraction;
5. entitlement creation;
6. unsubscribe endpoint;
7. rate limiting/token security.

### Phase 2 — Admin

1. Newsletter sidebar module;
2. campaign CRUD;
3. promotion dropdown;
4. subscribers list/status filters;
5. statistics;
6. entitlement revoke/restore.

### Phase 3 — Frontend

1. reusable signup component;
2. homepage integration;
3. product page integration;
4. verification result page;
5. login/signup return flow;
6. entitlement display in cart.

### Phase 4 — Checkout

1. first-order detection;
2. entitlement-aware promotion preview;
3. transactional redemption;
4. order audit snapshot;
5. cancellation/admin restore policy.

### Phase 5 — Verification

1. duplicate subscription tests;
2. token expiry/reuse tests;
3. unsubscribe tests;
4. guest cannot redeem;
5. existing customer cannot redeem;
6. parallel checkout cannot double redeem;
7. inactive campaign hides sections;
8. admin authorization tests;
9. TypeScript, ESLint and production build.

### Phase 6 — Bulk campaigns and automations

1. provider domain/API integration;
2. subscriber-to-provider contact synchronization;
3. email template builder;
4. audience segment builder;
5. send-now and scheduling workflow;
6. background queue/provider Broadcast integration;
7. signed provider webhook processing;
8. bounce/complaint suppression;
9. delivery/click/conversion analytics;
10. automation event service.

## 19. Acceptance Criteria

- email database mein normalized subscriber record create kare;
- subscription explicit consent ke baghair submit na ho;
- duplicate submit duplicate entitlement na banaye;
- verification required ho and token one-time/expiring ho;
- verified subscriber ko one available entitlement mile;
- unverified subscriber discount use na kare;
- guest checkout newsletter discount use na kare;
- existing-order customer first-order offer use na kare;
- same entitlement once se zyada redeem na ho;
- checkout client calculation trust na kare;
- campaign inactive/expired ho to UI hide aur checkout reject kare;
- admin all display text/placement/schedule change kar sake;
- admin existing promotion dropdown se attach kare;
- homepage/product page same component use karein;
- fake alerts and public `WELCOME10` remove hon;
- unsubscribe and suppression work kare;
- private subscriber data public API se expose na ho;
- production build and security tests pass hon.
- admin all active subscribers ko one campaign send/schedule kar sake;
- unsubscribed/bounced/complained contacts bulk sends se exclude hon;
- bulk recipients BCC mein expose na hon;
- send endpoint background job/provider broadcast create karke quickly return kare;
- duplicate send request same campaign twice dispatch na kare;
- provider webhooks signature verified and idempotent hon;
- campaign delivery, click, bounce and unsubscribe statistics admin mein show hon;
- SPF, DKIM and DMARC verified hone ke baad production bulk sending enable ho.

## 20. Expected Files

```text
components/NewsletterSignup.tsx
components/admin/NewsletterAdminModule.tsx
components/admin/EmailCampaignsModule.tsx
components/admin/EmailTemplatesModule.tsx
components/admin/EmailSegmentsModule.tsx
app/page.tsx
app/product/page.tsx
app/cart/page.tsx
app/checkout/page.tsx
app/admin/page.tsx
app/newsletter/verified/page.tsx
app/newsletter/unsubscribe/page.tsx
app/api/newsletter/campaign/route.ts
app/api/newsletter/subscribe/route.ts
app/api/newsletter/verify/route.ts
app/api/newsletter/resend-verification/route.ts
app/api/newsletter/unsubscribe/route.ts
app/api/newsletter/entitlement/route.ts
app/api/admin/newsletter/campaigns/route.ts
app/api/admin/newsletter/subscribers/route.ts
app/api/admin/newsletter/stats/route.ts
app/api/admin/email/templates/route.ts
app/api/admin/email/segments/route.ts
app/api/admin/email/campaigns/route.ts
app/api/admin/email/campaigns/[id]/send/route.ts
app/api/admin/email/campaigns/[id]/schedule/route.ts
app/api/admin/email/campaigns/[id]/analytics/route.ts
app/api/webhooks/email/resend/route.ts
app/api/webhooks/email/sendgrid/route.ts
app/api/checkout/route.ts
app/api/promotions/apply/route.ts
lib/server/newsletter.ts
lib/server/email.ts
lib/server/email-provider.ts
lib/server/email-events.ts
lib/server/email-segments.ts
types/commerce.ts
firestore.indexes.json
firestore.rules
.env.example
```

This architecture newsletter signup ko sirf email collection form nahi rakhti; it makes it a verified, consent-aware and transactionally enforced first-order reward system.

## 21. Official Service References

- Firebase Trigger Email extension: https://firebase.google.com/docs/extensions/official/firestore-send-email
- Resend Audiences: https://resend.com/docs/dashboard/audiences/introduction
- Resend Segments: https://resend.com/docs/dashboard/segments/introduction
- SendGrid contacts: https://www.twilio.com/docs/sendgrid/ui/managing-contacts/create-and-manage-contacts
- SendGrid segments: https://www.twilio.com/docs/sendgrid/ui/managing-contacts/segmenting-your-contacts
- SendGrid Marketing Campaigns: https://www.twilio.com/docs/sendgrid/ui/sending-email/how-to-send-email-with-marketing-campaigns
