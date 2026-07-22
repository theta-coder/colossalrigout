# Dynamic Contact Page — Complete Implementation Plan

## 1. Goal

Current `/contact` page ko Firestore aur Admin Panel se fully manageable banana hai. Public form ko real contact system mein convert kiya jayega taa-ke customer inquiry database mein safely save ho, admin usay dekh aur manage kar sake, aur customer ko reliable submission confirmation mile.

Existing responsive design preserve rahega, lekin hard-coded contact information, banner, map image, labels aur FAQ CTA dynamic ho jayenge.

## 2. Current Page Audit

Current `app/contact/page.tsx` mein:

- Hero image, title aur subtitle hard-coded hain
- Address, phone, email aur business hours hard-coded hain
- Map sirf static image aur JavaScript alert hai
- FAQ teaser text hard-coded hai
- Contact form submit karne par sirf local success message show hota hai
- Inquiry Firestore mein save nahi hoti
- Admin ko message receive ya manage karne ka system nahi hai
- Spam protection, server validation aur rate limiting nahi hai

## 3. Recommended Admin Module Name

Admin sidebar label: **Contact & Inquiries**

Yeh naam page content aur customer messages dono ko clearly represent karta hai.

Admin module ke internal tabs:

1. **Inbox**
2. **Page & Hero**
3. **Contact Details**
4. **Map & Links**
5. **Form Settings**

## 4. Dynamic Scope

Admin ko following controls milne chahiye:

- Hero title, subtitle, image aur image alt text
- Breadcrumb label
- Form heading, helper text aur submit-button label
- Form fields enable/disable and required/optional controls
- Contact subjects/categories manage karna
- Address, phone, support email aur working hours
- WhatsApp number/link (optional)
- Map image, Google Maps URL aur store-locator CTA
- FAQ teaser heading, description, button label aur URL
- Page/sections show or hide
- Customer inquiries read, search, filter, assign, archive aur status update karna

## 5. Recommended Firestore Structure

### 5.1 `contact-page/settings`

Single settings document:

```ts
interface ContactPageSettings {
  id: 'settings';
  pageActive: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroImageId: string | null;
  heroImageAlt: string;
  breadcrumbLabel: string;
  formHeading: string;
  formDescription: string;
  submitButtonLabel: string;
  successHeading: string;
  successMessage: string;
  responseTimeText: string;
  contactDetailsActive: boolean;
  mapSectionActive: boolean;
  faqCtaActive: boolean;
  faqHeading: string;
  faqDescription: string;
  faqButtonLabel: string;
  faqButtonUrl: string;
  updatedAt: Timestamp;
  updatedBy?: string;
}
```

### 5.2 `contact-details`

Structured and reorderable records:

```ts
interface ContactDetail {
  id: string;
  type: 'address' | 'phone' | 'email' | 'hours' | 'whatsapp' | 'custom';
  label: string;
  value: string;
  href?: string;
  icon: 'map-pin' | 'phone' | 'mail' | 'clock' | 'message-circle';
  order: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Phone, email and WhatsApp records ke `href` respectively `tel:`, `mailto:` aur approved `https://wa.me/` format mein validate hon.

### 5.3 `contact-subjects`

```ts
interface ContactSubject {
  id: string;
  name: string;
  slug: string;
  recipientEmail?: string;
  order: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Suggested defaults: Order Help, Product Question, Returns & Exchange, Payment Issue, Store Information, General Inquiry.

### 5.4 `contact-inquiries`

```ts
type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'archived' | 'spam';

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  orderId?: string;
  subjectId?: string;
  subjectLabel: string;
  message: string;
  status: InquiryStatus;
  priority: 'normal' | 'high';
  assignedTo?: string | null;
  adminNotes?: string;
  source: 'contact_page';
  customerUid?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp | null;
}
```

Do not store raw IP addresses. Rate-limiting ke liye one-way hash with short retention use kiya ja sakta hai.

### 5.5 `contact-map/settings`

```ts
interface ContactMapSettings {
  mapImageId: string | null;
  mapImageAlt: string;
  mapUrl: string;
  ctaLabel: string;
  openInNewTab: boolean;
  active: boolean;
  updatedAt: Timestamp;
}
```

## 6. Form Fields

Recommended public form:

- Name — required
- Email — required
- Phone — optional
- Order ID — optional; order-related subject par show kiya ja sakta hai
- Subject/category — required dropdown
- Message — required
- Privacy consent checkbox — required if privacy policy requires it
- Hidden honeypot field — automated spam detection

Admin Form Settings mein optional fields enable/disable kiye ja sakte hain. Core identity and message fields ko disable nahi karna chahiye.

## 7. API Design

### Public APIs

- `GET /api/contact-page` — active public settings, details, subjects and map payload
- `POST /api/contact-inquiries` — validated inquiry create kare

Public response mein admin notes, recipient emails aur internal metadata expose na hon.

### Admin APIs

- `GET/PUT /api/contact-page/settings`
- `GET/POST/PUT/DELETE /api/contact-details`
- `POST /api/contact-details/reorder`
- `GET/POST/PUT/DELETE /api/contact-subjects`
- `POST /api/contact-subjects/reorder`
- `GET /api/admin/contact-inquiries`
- `GET/PATCH /api/admin/contact-inquiries/[id]`
- `POST /api/admin/contact-inquiries/bulk-status`
- `POST /api/contact-page/seed`

Every write/admin read must use the existing server-side admin authentication pattern.

## 8. Submission Flow

```text
Customer fills form
        ↓
Client validation
        ↓
POST /api/contact-inquiries
        ↓
Server validation + spam/rate-limit checks
        ↓
Firestore inquiry created
        ↓
Optional admin/customer email notification
        ↓
Success state with inquiry reference
```

Success UI sirf database write successful hone ke baad show ho. API failure par form values preserve rahen aur retry option mile.

## 9. Validation and Abuse Protection

- Name: 2–100 characters
- Email: normalized and valid format
- Phone: optional, length/character validation
- Order ID: optional, strict length/format validation
- Subject: active database subject hona chahiye
- Message: 10–3000 characters
- Trim all plain-text values
- HTML/script content store/render na kiya jaye
- Honeypot bot field
- Per-client rate limit, e.g. 5 submissions per 15 minutes
- Duplicate submission detection for a short window
- Payload-size limit
- Optional CAPTCHA later if abuse increases

## 10. Admin Inbox UX

Inbox table/cards mein:

- Customer name and email
- Subject
- Created date/time
- Status badge
- Priority
- Assigned admin
- Message preview

Controls:

- Search by name, email, order ID or message
- Filter by status, subject and date
- Sort newest/oldest
- Open full inquiry drawer/page
- Mark New, In Progress, Resolved, Archived or Spam
- Add internal notes
- Assign inquiry to administrator
- Bulk status updates
- Pagination/cursor loading

Dashboard badge par unresolved/new inquiry count optionally show ho.

## 11. Email Notifications

Recommended optional integration:

- Admin notification when a new inquiry is stored
- Customer acknowledgement containing inquiry reference and response expectation
- Subject-based routing to the appropriate support address
- Email failure must not delete or reject an already saved inquiry
- Email send result can be logged as `notificationStatus`

SMTP/API credentials client code ya Firestore mein store na hon; environment variables/server secrets use hon.

## 12. Hero and Map Images

- Existing managed upload endpoint/pattern reuse karein
- Hero recommended ratio: wide banner, minimum 1600px width
- Map image recommended ratio: 16:10
- JPG, PNG and WebP only
- MIME/type, dimensions and size server-side verify hon
- Optimized WebP/AVIF derivative preferred
- New upload successful hone ke baad old managed image clean karein
- Arbitrary admin-entered image URLs avoid karein

Map CTA `href="#"` aur alert ke bajaye validated Google Maps or `/store-locator` URL open kare.

## 13. Storefront Integration

`app/contact/page.tsx` ko smaller components mein divide karna recommended hai:

- `ContactHero`
- `ContactForm`
- `ContactDetails`
- `ContactMapCard`
- `ContactFaqCta`

Page load par `/api/contact-page` payload fetch/render ho. Existing layout and animation classes preserve ki ja sakti hain.

Phone, email and map details clickable hon. External map link par `rel="noopener noreferrer"` apply ho.

## 14. Loading, Empty and Error States

- Initial skeleton for hero/details/form
- Page inactive ho to friendly unavailable state or `notFound()` behavior
- No active contact details ho to info card hide ho
- No active subjects ho to safe fallback subject use ho ya submission temporarily disable ho
- Fetch failure par retry state
- Submit button loading state and double-submit prevention
- Inline validation errors
- Success message with inquiry reference

## 15. Accessibility

- Every form control ke saath real `<label>`
- Errors `aria-describedby` se linked hon
- Submission status ke liye `aria-live`
- Logical keyboard focus order
- Visible focus styles
- Image alt text required
- Icons decorative hon to `aria-hidden`
- Color alone status indicator na ho
- Success ke baad focus confirmation panel par move ho

## 16. Security and Privacy

- Admin endpoints server-side protected hon
- Public create endpoint allow ho; public inquiry list/read forbidden ho
- Inquiry documents client Firestore SDK se directly readable na hon
- Admin output and notes safely rendered as text
- Server timestamps use hon
- Allowed URL protocols/domains validate hon
- Sensitive data application logs mein print na ho
- Inquiry retention policy define ho, e.g. resolved inquiries 12–24 months
- Permanent deletion confirmation ke saath ho; default action Archive ho

## 17. Suggested Firestore Indexes

Likely composite indexes:

- `contact-inquiries`: `status + createdAt desc`
- `contact-inquiries`: `subjectId + createdAt desc`
- `contact-inquiries`: `assignedTo + status + createdAt desc`
- Active/order queries for `contact-details` and `contact-subjects`

Exact indexes query implementation ke according create hon.

## 18. Seed/Migration

One-time authenticated seed current visible content migrate kare:

- CONTACT US
- We'd love to hear from you.
- Current form headings and button text
- Lahore address
- Current phone, support email and working hours
- Current hero/map images as managed image records where possible
- Current FAQ teaser
- Default contact subjects

Seed endpoint idempotent ho: existing initialized content overwrite na kare, unless explicit confirmation/force mode ho.

## 19. Files Expected to Change During Implementation

- `app/contact/page.tsx`
- `app/admin/page.tsx`
- `components/admin/ContactInquiriesModule.tsx`
- `components/contact/ContactForm.tsx`
- `components/contact/ContactDetails.tsx`
- `lib/contact-page.ts`
- `app/api/contact-page/route.ts`
- `app/api/contact-page/settings/route.ts`
- `app/api/contact-page/seed/route.ts`
- `app/api/contact-details/route.ts`
- `app/api/contact-details/reorder/route.ts`
- `app/api/contact-subjects/route.ts`
- `app/api/contact-subjects/reorder/route.ts`
- `app/api/contact-inquiries/route.ts`
- `app/api/admin/contact-inquiries/route.ts`
- `app/api/admin/contact-inquiries/[id]/route.ts`
- Firestore rules/index configuration if maintained in repository

Actual paths existing project conventions ke mutabiq adjust ho sakte hain.

## 20. Implementation Phases

### Phase 1 — Foundation

1. Shared types, sanitizers and validators
2. Firestore collections and indexes
3. Public/admin API endpoints
4. Idempotent seed endpoint

### Phase 2 — Real Inquiry System

1. Form fields and subject dropdown
2. Server submission and Firestore persistence
3. Spam/rate-limit protections
4. Loading, success and failure states

### Phase 3 — Admin Module

1. Add Contact & Inquiries sidebar entry
2. Inbox and inquiry detail view
3. Status, notes, assignment and filters
4. Page/contact/map/form settings editors
5. Reordering and image management

### Phase 4 — Dynamic Storefront

1. Replace hard-coded page content
2. Render dynamic details, map and FAQ CTA
3. Add clickable contact links
4. Accessibility and responsive verification

### Phase 5 — Verification

1. CRUD and permission tests
2. Valid/invalid/spam submission tests
3. Inbox filter/status tests
4. Image replace/delete tests
5. Seed repeat test
6. ESLint, TypeScript and production build
7. Desktop/mobile browser testing

## 21. Acceptance Criteria

- Admin sidebar mein **Contact & Inquiries** module available ho
- Contact form inquiry Firestore mein reliably save kare
- Fake timer-based success behavior completely removed ho
- Admin inquiries read, filter, assign, note and status-update kar sake
- Hero, contact details, form text, map and FAQ CTA dynamic hon
- Phone/email/map links functional hon
- Hidden sections storefront par render na hon
- Server validation and rate limiting active ho
- Public users inquiries read na kar saken
- Existing visible content safely seed ho
- Loading, validation, error and success states complete hon
- Responsive design and accessibility maintain ho
- ESLint, TypeScript and production build pass hon

## 22. Test Checklist

### Public Page

- [ ] Dynamic settings/details load
- [ ] Active/hidden sections work
- [ ] Phone, email, WhatsApp and map links work
- [ ] Mobile and desktop layouts remain correct

### Form

- [ ] Valid inquiry saves once
- [ ] Invalid email/message rejected
- [ ] Inactive subject rejected server-side
- [ ] Double click cannot duplicate submission
- [ ] API failure preserves entered values
- [ ] Rate limit and honeypot work
- [ ] Success shows real inquiry reference

### Admin Inbox

- [ ] Auth protection works
- [ ] Search/filter/pagination work
- [ ] Status, priority, notes and assignment persist
- [ ] Archived/spam filters work
- [ ] Public payload never exposes internal fields

### Content Management

- [ ] Hero/form/contact/map/FAQ settings save
- [ ] Detail and subject CRUD/reorder works
- [ ] Image replace/preserve/delete behavior works
- [ ] Seed is idempotent

### Quality

- [ ] Accessibility checks pass
- [ ] TypeScript and ESLint pass
- [ ] Production build passes

## 23. Final Recommendation

Contact page ko sirf editable content page na banaya jaye. Best professional implementation ek combined **Contact & Inquiries** module hai: page appearance/settings dynamic hon aur public form real Firestore-backed support inbox se connected ho. Email notifications useful enhancement hain, lekin Firestore inquiry record ko primary source of truth rehna chahiye.
