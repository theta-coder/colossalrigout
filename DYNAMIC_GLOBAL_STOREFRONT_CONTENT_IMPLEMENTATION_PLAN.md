# Dynamic Global Storefront Content — Complete Implementation Plan

## 1. Objective

The purpose of this implementation is to make only the following storefront content manageable from the existing Admin Dashboard:

1. Top announcement bar
2. Homepage newsletter discount content
3. Footer company details and social links
4. Footer trust/promotional pillars

All other navigation labels, section headings, internal links, copyright structure, payment badges, placeholder images, and hero fallback slides will remain hardcoded. This keeps the system simple and avoids unnecessary Firestore reads and admin controls.

---

## 2. Current State

### Top announcement bar

Current file: `components/Header.tsx`

Currently hardcoded:

- `FREE SHIPPING ON ORDERS OVER $75 | EASY RETURNS`
- Announcement visibility cannot be controlled from Admin.
- Message, optional link, and link label cannot be changed without editing code.

### Newsletter discount

Current file: `components/home/NewsletterFormClient.tsx`

Currently hardcoded:

- Heading: `GET 10% OFF YOUR FIRST ORDER`
- Description
- Coupon: `WELCOME10`
- Success alert
- Input placeholder and button label

### Footer company and social details

Current file: `components/Footer.tsx`

Currently hardcoded:

- Brand description
- Instagram, Facebook, and YouTube labels
- Social URLs currently point to `#`
- Website/domain shown in copyright line

The `SHOP` audience links are already dynamic through `/api/audience-groups` and should not be changed by this implementation.

### Footer trust/promotional pillars

Current file: `components/Footer.tsx`

Currently hardcoded:

- Sustainable Materials
- Ethical Production
- Community Focused
- All three descriptions

---

## 3. Functional Scope

### Included

- One Admin Dashboard module named **Storefront Content**.
- Announcement bar settings and preview.
- Newsletter text, discount, and coupon settings.
- Footer brand/company information.
- Footer social links.
- Footer trust/promotional pillars.
- Active/inactive controls where useful.
- Ordered social links and footer pillars.
- Server-side validation and sanitization.
- Public read API and protected admin update API.
- Default content seeding.
- Cache invalidation after updates.
- Storefront fallback values if Firestore is unavailable.
- Responsive storefront and admin UI.

### Not included

- Dynamic main header navigation.
- Dynamic homepage section headings.
- Dynamic footer Help/Company navigation links.
- Dynamic payment methods.
- Mailing-list provider integration.
- Subscriber database or newsletter email delivery.
- Automatic promotion creation.
- Dynamic copyright layout.
- New image uploads.

The newsletter form will continue to show a success response locally. A real subscriber workflow can be added later as a separate feature.

---

## 4. Recommended Firestore Design

Use one collection named `storefront-settings` with three fixed documents. Fixed document IDs make reads predictable and prevent duplicate settings records.

### Document 1: `storefront-settings/announcement`

```ts
interface AnnouncementSettings {
  id: 'announcement';
  enabled: boolean;
  message: string;
  secondaryMessage: string;
  separator: string;
  linkLabel: string;
  linkHref: string;
  openInNewTab: boolean;
  updatedAt: string;
  updatedBy: string;
}
```

Recommended default:

```json
{
  "enabled": true,
  "message": "FREE SHIPPING ON ORDERS OVER $75",
  "secondaryMessage": "EASY RETURNS",
  "separator": "|",
  "linkLabel": "",
  "linkHref": "",
  "openInNewTab": false
}
```

Rendering rules:

- Hide the entire announcement bar when `enabled` is `false`.
- Render `secondaryMessage` and `separator` only when the secondary message exists.
- If `linkLabel` and `linkHref` are valid, render the announcement as a link.
- Internal paths must begin with one `/`.
- External URLs must use `https://`.

### Document 2: `storefront-settings/newsletter`

```ts
interface NewsletterSettings {
  id: 'newsletter';
  enabled: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  couponCode: string;
  inputPlaceholder: string;
  buttonLabel: string;
  successMessage: string;
  termsText: string;
  updatedAt: string;
  updatedBy: string;
}
```

Recommended default:

```json
{
  "enabled": true,
  "eyebrow": "",
  "heading": "GET 10% OFF YOUR FIRST ORDER",
  "description": "Subscribe to our newsletter for exclusive offers and new arrivals.",
  "discountType": "percentage",
  "discountValue": 10,
  "couponCode": "WELCOME10",
  "inputPlaceholder": "Enter your email",
  "buttonLabel": "SUBSCRIBE",
  "successMessage": "Thanks for subscribing! Use {{couponCode}} for {{discountLabel}}.",
  "termsText": ""
}
```

Supported safe template tokens:

- `{{couponCode}}`
- `{{discountValue}}`
- `{{discountLabel}}`

Example resolved message:

```text
Thanks for subscribing! Use WELCOME10 for 10% off.
```

Coupon behavior:

- Admin enters an existing coupon code.
- Save operation may check the existing `promotions` collection and display a warning if the code does not exist or is inactive.
- The settings module must not silently create or edit a promotion.
- The storefront can still display a manually entered code, but Admin should clearly see its validation status.

### Document 3: `storefront-settings/footer`

```ts
interface FooterSettings {
  id: 'footer';
  brandName: string;
  brandAccentText: string;
  brandDescription: string;
  websiteLabel: string;
  socialLinks: FooterSocialLink[];
  pillars: FooterPillar[];
  updatedAt: string;
  updatedBy: string;
}

interface FooterSocialLink {
  id: string;
  platform: 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'x' | 'custom';
  label: string;
  url: string;
  enabled: boolean;
  order: number;
}

interface FooterPillar {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
}
```

Recommended default:

```json
{
  "brandName": "Colossal",
  "brandAccentText": "Rigout",
  "brandDescription": "Trendy pieces, timeless style. Wear your confidence with Colossal Rigout.",
  "websiteLabel": "colossalrigout.pk",
  "socialLinks": [
    {
      "id": "instagram",
      "platform": "instagram",
      "label": "IG",
      "url": "",
      "enabled": true,
      "order": 1
    },
    {
      "id": "facebook",
      "platform": "facebook",
      "label": "FB",
      "url": "",
      "enabled": true,
      "order": 2
    },
    {
      "id": "youtube",
      "platform": "youtube",
      "label": "YT",
      "url": "",
      "enabled": true,
      "order": 3
    }
  ],
  "pillars": [
    {
      "id": "sustainable-materials",
      "title": "SUSTAINABLE MATERIALS",
      "description": "Better for you. Better for the planet.",
      "enabled": true,
      "order": 1
    },
    {
      "id": "ethical-production",
      "title": "ETHICAL PRODUCTION",
      "description": "Made with care and respect.",
      "enabled": true,
      "order": 2
    },
    {
      "id": "community-focused",
      "title": "COMMUNITY FOCUSED",
      "description": "Fashion that gives back.",
      "enabled": true,
      "order": 3
    }
  ]
}
```

Why fixed documents are recommended:

- The storefront requires only three predictable reads.
- All related fields can be updated atomically per section.
- The Admin UI can save each section separately.
- Default records are straightforward to seed.
- Duplicate configuration documents cannot be created accidentally.

---

## 5. Shared Types and Defaults

Create:

```text
lib/storefront-settings.ts
```

This file should contain:

- All public TypeScript interfaces.
- Default announcement settings.
- Default newsletter settings.
- Default footer settings.
- Normalization helpers.
- Template-token interpolation helper.
- URL validation helper.
- Coupon-code normalization helper.

Important normalization behavior:

- Missing Firestore fields must fall back field-by-field, not replace the whole document.
- Strings must be trimmed.
- Coupon codes must be uppercase and limited to safe characters.
- Orders must be converted to finite integers.
- Unknown social platforms should become `custom`.
- Disabled items must remain stored but should not render publicly.

---

## 6. Server Data Layer

Create:

```text
lib/server/storefront-settings.ts
```

Recommended exported functions:

```ts
getAnnouncementSettings(): Promise<AnnouncementSettings>
getNewsletterSettings(): Promise<NewsletterSettings>
getFooterSettings(): Promise<FooterSettings>
getAllStorefrontSettings(): Promise<StorefrontSettingsBundle>
```

Requirements:

- Use the existing named Firestore database.
- Use the working Firebase SDK fallback pattern already used by the project.
- Never return `null` to storefront components.
- If a document is missing, return the corresponding hardcoded default.
- If Firestore is unavailable, log the server error and return defaults.
- Normalize all returned records before sending them to components.
- Do not expose `updatedBy` publicly.
- Deduplicate reads within the same request using React `cache()` where suitable.

Caching tags:

```text
storefront-settings
storefront-settings:announcement
storefront-settings:newsletter
storefront-settings:footer
```

Recommended revalidation period:

```text
3600 seconds
```

Admin updates must call:

```ts
revalidatePath('/')
revalidateTag('storefront-settings')
revalidateTag('storefront-settings:<section>')
```

If Header and Footer appear on every page, use `revalidatePath('/', 'layout')` or the version-compatible layout invalidation approach so updated global content is not limited to the homepage cache.

---

## 7. API Design

### Public read endpoint

Create:

```text
app/api/storefront-settings/route.ts
```

Supported request:

```http
GET /api/storefront-settings
```

Response:

```json
{
  "success": true,
  "data": {
    "announcement": {},
    "newsletter": {},
    "footer": {}
  }
}
```

This route must return normalized public values and defaults on missing documents.

### Protected admin endpoint

Create:

```text
app/api/admin/storefront-settings/route.ts
```

Supported requests:

```http
GET /api/admin/storefront-settings
PUT /api/admin/storefront-settings
```

Example update body:

```json
{
  "section": "newsletter",
  "data": {
    "enabled": true,
    "heading": "GET 15% OFF YOUR FIRST ORDER",
    "couponCode": "WELCOME15"
  }
}
```

Security requirements:

- Use the project's existing server-side Admin authorization helper.
- Production updates require a verified Admin identity.
- Never trust `updatedBy` received from the browser.
- Derive `updatedBy` from the authenticated Admin.
- Only allow the three known section names.
- Reject unknown fields instead of spreading arbitrary input into Firestore.
- Add request-size limits.
- Return safe validation errors without stack traces.

### Seed endpoint

Create:

```text
app/api/admin/storefront-settings/seed/route.ts
```

Supported request:

```http
POST /api/admin/storefront-settings/seed
```

Seed behavior:

- Protected by Admin authorization.
- Create only missing documents by default.
- Never overwrite existing Admin content unless an explicit validated `reset=true` action is used.
- A reset action must show a confirmation dialog in Admin.
- Return which documents were created, skipped, or reset.

---

## 8. Validation Rules

### Announcement

- `message`: required when enabled, 1–140 characters.
- `secondaryMessage`: maximum 100 characters.
- `separator`: maximum 5 characters.
- `linkLabel`: maximum 40 characters.
- `linkHref`: empty, safe internal path, or `https://` URL.
- `javascript:`, `data:`, protocol-relative `//`, and backslash URLs must be rejected.

### Newsletter

- `heading`: required when enabled, maximum 100 characters.
- `description`: maximum 240 characters.
- `discountType`: strict enum.
- Percentage: greater than 0 and at most 100.
- Fixed amount: greater than 0 and within a sensible configured maximum.
- `couponCode`: uppercase letters, numbers, underscore, and hyphen only; maximum 40 characters.
- `inputPlaceholder`: maximum 60 characters.
- `buttonLabel`: required, maximum 30 characters.
- `successMessage`: maximum 240 characters.
- Only the approved template tokens may be used.

### Footer company content

- Brand fields: maximum 60 characters each.
- Brand description: maximum 300 characters.
- Website label: maximum 100 characters.
- Do not render arbitrary HTML.

### Social links

- Maximum 8 social links.
- Unique IDs.
- Label: 1–10 characters.
- URL: valid `https://` URL.
- Empty URL may be stored, but an enabled social link without a URL must not render publicly.
- Order: finite non-negative integer.

### Footer pillars

- Maximum 6 pillars.
- Unique IDs.
- Title: 1–60 characters.
- Description: 1–160 characters.
- Order: finite non-negative integer.
- Render only enabled items.

---

## 9. Admin Dashboard Module

Create:

```text
components/admin/StorefrontContentModule.tsx
```

Add a new lazy-loaded Admin tab:

```text
Storefront Content
```

Suggested icon:

```text
PanelsTopLeft, Settings, or MonitorCog
```

The module should have four sub-tabs or cards:

1. Announcement Bar
2. Newsletter Discount
3. Footer Company & Socials
4. Footer Pillars

### Announcement form

Fields:

- Enabled toggle
- Primary message
- Secondary message
- Separator
- Optional link label
- Optional link URL
- Open in new tab toggle for external links

Preview:

- Desktop announcement preview.
- Mobile preview with text wrapping/truncation behavior.

### Newsletter form

Fields:

- Enabled toggle
- Eyebrow
- Heading
- Description
- Discount type
- Discount value
- Coupon code
- Coupon validation status
- Input placeholder
- Button label
- Success message template
- Optional terms text

Preview:

- Render the actual newsletter visual style.
- Resolve tokens using the current unsaved form values.
- Show the exact success message Admin customers will receive.

### Footer company/social form

Fields:

- Brand name
- Accent text
- Brand description
- Website label
- Repeater for social links

Each social row must support:

- Platform selector
- Short label
- URL
- Enabled toggle
- Move up/down
- Delete
- Add social link

### Footer pillars form

Each pillar row must support:

- Title
- Description
- Enabled toggle
- Move up/down
- Delete
- Add pillar

Show a desktop and mobile preview because the live footer changes from three columns to stacked rows.

### Admin UX requirements

- Load saved content on module open.
- Maintain independent dirty state for each section.
- Save one section at a time.
- Disable Save during request.
- Show inline validation errors.
- Show success/error notification.
- Warn before leaving a section with unsaved changes.
- Add `Reset to defaults` behind a destructive confirmation.
- Prevent duplicate submissions.
- Use `adminApiFetch()` for protected requests.
- Never write directly to Firestore from this new module.

---

## 10. Storefront Integration

### Header

Update:

```text
components/Header.tsx
app/layout.tsx
```

Recommended approach:

- Fetch announcement settings in the server layout.
- Pass normalized settings into the client `Header` component as props.
- Avoid a browser `useEffect` request so the bar does not flash or shift after hydration.
- Hide the bar entirely when disabled.
- Keep Store Locator and Help controls hardcoded.

Proposed prop:

```ts
<Header announcement={announcementSettings} />
```

### Newsletter

Update:

```text
components/home/NewsletterFormClient.tsx
app/page.tsx
```

Recommended approach:

- Fetch settings in the server component/page data layer.
- Pass normalized settings to the client form.
- Keep only form interaction in the client component.
- Hide the section when disabled.
- Resolve success-message tokens safely.
- Do not use `dangerouslySetInnerHTML`.

Proposed prop:

```ts
<NewsletterFormClient settings={newsletterSettings} />
```

### Footer

Update:

```text
components/Footer.tsx
app/layout.tsx
```

Recommended approach:

- Fetch Footer settings in the server layout.
- Pass them to the existing Footer client component.
- Preserve the existing dynamic audience-group loading.
- Sort social links and pillars by `order`.
- Render enabled social links only when a valid URL exists.
- External links must use `target="_blank"` with `rel="noopener noreferrer"`.
- Keep Help and Company links hardcoded.
- Keep the current year generated in code.

Proposed prop:

```ts
<Footer settings={footerSettings} />
```

### Avoiding repeated global reads

`app/layout.tsx` should fetch announcement and footer settings in parallel:

```ts
const [announcement, footer] = await Promise.all([
  getAnnouncementSettings(),
  getFooterSettings(),
]);
```

The homepage should request newsletter settings independently, using the shared cached server helper.

---

## 11. Failure and Fallback Behavior

The storefront must remain usable when Firebase is slow, unavailable, or permissions are misconfigured.

Required behavior:

- Announcement failure → use current hardcoded announcement default.
- Newsletter failure → use current hardcoded newsletter default.
- Footer failure → use current hardcoded company content and pillars.
- Invalid social URL → omit that social link only.
- Invalid item in a list → omit the item rather than breaking the Footer.
- Admin read failure → show an error and offer Retry; do not replace the form with blank values.
- Admin save failure → preserve the Admin's unsaved form values.

No storefront component should return an empty page because settings could not be loaded.

---

## 12. Migration and Seeding Strategy

1. Add shared types, defaults, and validators.
2. Add the protected seed route.
3. Seed the three fixed documents with the exact current hardcoded values.
4. Verify Firestore values match the existing live design.
5. Add server getters and fallback behavior.
6. Integrate Header, Newsletter, and Footer props.
7. Confirm the storefront looks unchanged after migration.
8. Add the Admin module.
9. Test Admin changes and cache invalidation.
10. Remove duplicated strings from the components only after the Firestore-backed version is verified.

The initial deployment should produce no visible content change. It only changes where selected content is managed.

---

## 13. Suggested File Changes

### New files

```text
lib/storefront-settings.ts
lib/server/storefront-settings.ts
app/api/storefront-settings/route.ts
app/api/admin/storefront-settings/route.ts
app/api/admin/storefront-settings/seed/route.ts
components/admin/StorefrontContentModule.tsx
```

### Existing files to update

```text
app/layout.tsx
app/page.tsx
app/admin/page.tsx
components/Header.tsx
components/Footer.tsx
components/home/NewsletterFormClient.tsx
```

### Optional test files

```text
lib/storefront-settings.test.ts
components/admin/StorefrontContentModule.test.tsx
e2e/storefront-content.spec.ts
```

---

## 14. Implementation Phases

### Phase 1 — Foundation

- Create types and default content.
- Add normalization and validation helpers.
- Add server getters.
- Add Admin authorization to new endpoints.
- Add seed endpoint.

Completion criteria:

- Three documents can be seeded safely.
- Missing documents return defaults.
- Invalid stored data cannot break rendering.

### Phase 2 — Storefront rendering

- Pass announcement settings to Header.
- Pass newsletter settings to the form.
- Pass Footer settings to Footer.
- Add enabled/disabled behavior.
- Add social URL safety.
- Add cache tags and fallback behavior.

Completion criteria:

- Initial visual output matches the current storefront.
- Settings failure does not hide or crash global content.
- No hydration mismatch or layout flash is introduced.

### Phase 3 — Admin management

- Create Storefront Content module.
- Add four edit sections.
- Add previews.
- Add coupon validation status.
- Add ordering controls.
- Add save/reset flows.

Completion criteria:

- Admin can update each section independently.
- Invalid input cannot be saved.
- Unsaved changes survive failed requests.

### Phase 4 — Verification and cleanup

- Test desktop and mobile.
- Test disabled sections.
- Test Firebase failure fallback.
- Test cache invalidation.
- Run build and type checks.
- Remove obsolete duplicated hardcoded render strings while retaining defaults in the shared settings file.

---

## 15. Testing Checklist

### Announcement

- Current default displays exactly as before.
- Primary-only message renders without a separator.
- Primary and secondary messages render in correct order.
- Disabled bar is removed without leaving blank space.
- Internal link works.
- External HTTPS link opens safely.
- Unsafe URLs are rejected.
- Long text behaves acceptably on mobile.

### Newsletter

- Default content matches the current design.
- Heading, description, coupon, placeholder, and button update correctly.
- Percentage and fixed discount labels resolve correctly.
- Success-message tokens resolve correctly.
- Unknown tokens are rejected or rendered safely.
- Disabled newsletter is hidden.
- Email field remains required and validates email format.
- Form reset occurs only after successful local submission behavior.

### Footer socials/company

- Brand description updates.
- Website label updates.
- Enabled social links with valid URLs render.
- Disabled links do not render.
- Empty/invalid social URLs do not create `#` links.
- Reordering persists.
- External-link security attributes are present.

### Footer pillars

- Current three defaults render correctly.
- Titles and descriptions update.
- Disabled pillar is hidden.
- Reordering persists.
- One to six pillars remain responsive.

### Admin/security

- Unauthorized write returns `401` or `403`.
- Unknown section returns `400`.
- Unknown fields are discarded or rejected.
- Oversized payload is rejected.
- Seed does not overwrite existing data by default.
- Reset requires explicit confirmation.
- `updatedBy` comes from authenticated Admin identity.

### Reliability

- Firestore outage returns defaults.
- Missing document returns defaults.
- Partially populated document is normalized.
- Storefront does not become blank on request failure.
- Admin update invalidates the relevant cache.
- Production build completes successfully.
- Browser shows no Next.js error overlay or console errors.

---

## 16. Acceptance Criteria

The feature is complete when:

1. Admin has a Storefront Content section.
2. Admin can manage the announcement bar.
3. Admin can manage newsletter content and coupon display.
4. Admin can manage Footer company information and social URLs.
5. Admin can manage, enable, disable, and reorder Footer pillars.
6. Storefront changes appear without a code edit or redeployment.
7. Invalid values cannot break the storefront.
8. Firebase failure falls back to the current content.
9. Existing dynamic audience-group Footer links continue working.
10. Header navigation and non-selected content remain hardcoded.
11. Desktop and mobile layouts remain visually correct.
12. Build, type checking, and browser verification pass.

---

## 17. Final Recommended Architecture

```text
Firestore: storefront-settings/{announcement|newsletter|footer}
                         |
                         v
       lib/server/storefront-settings.ts
                 /                 \
                v                   v
        app/layout.tsx          app/page.tsx
          /       \                 |
         v         v                v
     Header      Footer       NewsletterFormClient

Admin Dashboard
      |
      v
StorefrontContentModule
      |
      v
/api/admin/storefront-settings
      |
      v
Firestore + cache/path revalidation
```

This architecture keeps global content centrally managed, provides safe defaults, avoids client-side layout flashing, preserves the current design, and limits dynamic complexity to the four areas that genuinely need Admin control.
