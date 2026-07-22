# Dynamic About Us Page — Complete Implementation Plan

## 1. Goal

Current `/about` page ka hard-coded content, values aur team members Firestore aur Admin Panel se fully manageable banana hai, while preserving the existing premium storefront design and responsive layout.

Admin sidebar mein dedicated **About Us** module hoga. Admin bina code changes ke:

- Hero content and image manage kare
- Brand story paragraphs manage kare
- Brand values add/edit/hide/reorder kare
- Team members add/edit/hide/delete/reorder kare
- Team member images device se upload kare
- Section headings and descriptions edit kare
- Whole page or individual content records control kare

## 2. Current Page Structure

Current `app/about/page.tsx` contains:

1. Hero background image
2. Hero eyebrow: `ABOUT US`
3. Hero heading: `OUR STORY`
4. Breadcrumb label
5. Three brand-story paragraphs
6. Three-value black strip
7. Behind the Brand heading and description
8. Four hard-coded team members with external images

All customer-facing content should become database-driven.

## 3. Recommended Scope

### Included

- Dynamic page settings
- Managed hero image upload
- Dynamic story paragraphs
- Dynamic brand values
- Dynamic team members
- Managed team-member image uploads
- Active/Hidden status
- Add, edit and delete
- Reliable Move Up/Down ordering
- Existing content migration/seed
- Loading, error, retry and empty states
- Firestore-backed public/admin APIs
- Admin authorization for mutations
- Server-side validation
- Safe plain-text rendering

### Not Included in First Version

- Rich-text/WYSIWYG editor
- Video backgrounds
- Social links per team member
- Multiple About pages
- Multilingual content
- Page analytics
- Drag-and-drop ordering

## 4. End-to-End Architecture

```text
Admin → About Us Module
        ├── Page & Hero Settings
        ├── Brand Story
        ├── Brand Values
        └── Team Members
                 ↓
        Firestore + managed images
                 ↓
          GET /api/about-page
                 ↓
              /about
```

## 5. Firestore Data Model

### 5.1 Collection: `about-page`

Single settings document:

```text
about-page/settings
```

```json
{
  "id": "settings",
  "heroEyebrow": "ABOUT US",
  "heroTitle": "OUR STORY",
  "heroImageId": "about-hero",
  "heroImageAlt": "Colossal Rigout studio background",
  "breadcrumbLabel": "About Us",
  "valuesSectionActive": true,
  "teamHeading": "BEHIND THE BRAND",
  "teamDescription": "The people who bring Colossal Rigout to life.",
  "teamSectionActive": true,
  "pageActive": true,
  "updatedAt": "2026-07-21T10:00:00.000Z"
}
```

### 5.2 Collection: `about-story-blocks`

Each paragraph is a separate ordered record:

```json
{
  "id": "story-uuid",
  "text": "Colossal Rigout started with a simple idea...",
  "order": 1,
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 5.3 Collection: `about-values`

```json
{
  "id": "value-uuid",
  "title": "SUSTAINABLE MATERIALS",
  "description": "Better for you. Better for the planet.",
  "icon": "leaf",
  "order": 1,
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Allowed icon keys:

- `leaf`
- `shield`
- `users`
- `heart`
- `sparkles`
- `globe`

### 5.4 Collection: `about-team-members`

```json
{
  "id": "member-uuid",
  "name": "Amna Sheikh",
  "role": "Founder & Creative Director",
  "bio": "",
  "imageId": "team-member-uuid",
  "imageAlt": "Amna Sheikh, Founder & Creative Director",
  "order": 1,
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 5.5 Image Collections

Recommended managed image records:

```text
about-page-images
```

Roles:

- `hero`
- `team-member`

Actual binary images should ideally use Firebase Storage. If current project architecture continues using optimized managed data images, images must remain size-limited and separated from content documents.

## 6. Shared Types

Recommended file:

```text
lib/about-page.ts
```

Types:

- `AboutPageSettings`
- `AboutStoryBlock`
- `AboutValue`
- `AboutTeamMember`
- `AboutPageImage`
- `AboutPagePayload`

## 7. API Design

### Public Combined Endpoint

```text
GET /api/about-page
```

Returns:

- Active settings
- Hero image
- Active story blocks
- Active values
- Active team members and images
- Records sorted by `order`

### Admin Combined Read

```text
GET /api/about-page?all=true
```

- Admin authorization required
- Active and hidden records return hon

### Settings

```text
POST /api/about-page/settings
```

### Story Blocks

```text
POST   /api/about-page/story
PUT    /api/about-page/story
DELETE /api/about-page/story?id={id}
PATCH  /api/about-page/story/reorder
```

### Brand Values

```text
POST   /api/about-page/values
PUT    /api/about-page/values
DELETE /api/about-page/values?id={id}
PATCH  /api/about-page/values/reorder
```

### Team Members

```text
POST   /api/about-page/team
PUT    /api/about-page/team
DELETE /api/about-page/team?id={id}
PATCH  /api/about-page/team/reorder
```

Team create/update should support `multipart/form-data` or the project’s managed optimized-image upload pattern.

### Seed

```text
POST /api/about-page/seed
```

- Admin required
- Empty data only
- Duplicate-safe and idempotent

## 8. Image Upload Strategy

### Hero Image

- JPG, PNG or WebP
- Maximum original upload: 8 MB
- Recommended optimized maximum dimensions: 1920×1200
- WebP conversion
- Existing image preserved if edit contains no new file
- New image successfully stored before old image cleanup

### Team Images

- JPG, PNG or WebP
- Maximum original upload: 5 MB
- Recommended optimized dimensions: 800×800
- Square crop/preview guidance
- WebP compression
- Existing member image preserved during text-only edits
- Member deletion cleans associated image

### Security

- External arbitrary image URLs should not be editable
- MIME type and size validation
- Unique system-generated IDs
- Admin authorization on upload/delete
- Customer-facing alt text always available

## 9. Validation Rules

### Settings

- Hero eyebrow: 2–60 characters
- Hero title: 2–100 characters
- Breadcrumb: 2–60 characters
- Hero alt: 2–160 characters
- Team heading: 2–100 characters
- Team description: maximum 500 characters

### Story Block

- Text required
- 10–3,000 characters
- Order non-negative whole number

### Brand Value

- Title: 2–100 characters
- Description: 2–500 characters
- Icon must match allowed icon key
- Order non-negative whole number

### Team Member

- Name: 2–100 characters
- Role: 2–120 characters
- Optional bio: maximum 1,500 characters
- Image required on create
- Image alt: 2–160 characters
- Order non-negative whole number

Server-side validation mandatory hai.

## 10. Admin Sidebar Integration

Admin item:

```text
About Us
```

Recommended placement:

```text
FAQ Manager
Shipping Policy
Returns & Exchanges
About Us
Trust Benefits
```

Suggested icon:

- `Building2`
- `Info`
- `UsersRound`

Tab ID:

```text
about-page
```

Header description:

```text
Manage brand story, values, team members, imagery, and page visibility
```

## 11. Admin Module UI

Recommended component:

```text
components/admin/AboutPageModule.tsx
```

### Internal Tabs

1. Page & Hero
2. Brand Story
3. Brand Values
4. Team Members

### Page & Hero

- Hero eyebrow
- Hero title
- Breadcrumb label
- Hero image upload and preview
- Hero image alt text
- Values section visibility
- Team heading
- Team description
- Team section visibility
- Whole-page visibility

### Brand Story

- Paragraph textarea
- Active/Hidden
- Add/Edit/Delete
- Move Up/Down
- Character count

### Brand Values

- Title
- Description
- Icon dropdown with preview
- Active/Hidden
- Add/Edit/Delete
- Move Up/Down

### Team Members

- Name
- Role
- Optional bio
- Image upload
- Image preview
- Alt text
- Active/Hidden
- Add/Edit/Delete
- Move Up/Down

## 12. Reordering

Each content type has a dedicated reorder endpoint.

Required behavior:

1. Complete ordered ID list validate ho
2. Duplicate/missing IDs reject hon
3. Firestore batch writes sequential order values
4. Partial swap failure avoid ho
5. Admin list refresh ho

## 13. Storefront `/about` Integration

Remove:

- Hard-coded `team` array
- Hard-coded story paragraphs
- Hard-coded values
- Hard-coded headings
- External team image URLs

Render:

- Hero settings and managed image
- Story blocks sorted by order
- Values strip sorted by order
- Team heading and description
- Active team grid sorted by order

Existing responsive design preserve rahega.

### Dynamic Grid

Team grid item count ke mutabiq adapt kare:

- 1 member: centered single card
- 2 members: two-column
- 3–4 members: responsive grid
- More than 4: wrap into additional rows

## 14. Storefront States

### Loading

- Lightweight page skeleton/spinner
- Layout shift minimize ho

### Error

- Friendly error message
- Retry button
- Page crash na ho

### Empty Story

- Story section hide ho

### Empty Values

- Black values strip hide ho

### Empty Team

- Team section hide ho or approved empty message show ho
- Recommended: hide the section

### Page Inactive

- Friendly unavailable content or `notFound()`
- Recommended: customer-friendly unavailable panel plus home link

## 15. Safe Rendering

- Story, values, roles and bios plain text render hon
- `dangerouslySetInnerHTML` avoid ho
- Multiline copy `whitespace-pre-line` use kare
- Image alt fields always render hon
- User-controlled external URLs supported na hon

## 16. Initial Migration/Seed

Seed current content:

### Settings

- ABOUT US
- OUR STORY
- About Us breadcrumb
- Current Behind the Brand heading/description

### Story

- Current three story paragraphs

### Values

- Sustainable Materials
- Ethical Production
- Community Focused

### Team

- Amna Sheikh
- Danish Ali
- Hira Malik
- Osman Tariq

Current remote images should be imported once into managed storage/image records rather than preserved as editable external URLs.

Seed verification:

- 1 settings document
- 3 story blocks
- 3 value records
- 4 team members
- 1 hero image
- 4 team images
- Repeat seed blocked

## 17. Admin UX

- Loading and saving states
- Image upload progress
- Local image preview
- Success/error toasts
- Delete confirmations
- Edit cancel/reset
- Active/Hidden badges
- Character counters
- Empty-state seed button
- Refresh action
- Mobile-friendly management cards

## 18. Accessibility

- Correct labels for all fields
- Image previews include alt text
- Storefront heading hierarchy remains semantic
- Team images have meaningful alt text
- Status not communicated by color only
- Keyboard-accessible actions
- Loading/error states use `aria-live`

## 19. Security

- Public endpoint returns active content only
- `?all=true` requires admin
- Mutations/uploads/deletes require admin
- Request fields allowlisted
- Timestamps server-generated
- File MIME/size validation
- Plain-text rendering prevents stored XSS
- Reorder IDs checked against database
- Associated image cleanup restricted to exact managed paths

Firestore production-rule migration remains required before deployment because current project uses broad sandbox rules.

## 20. Performance

- Settings/content/images fetched in parallel
- Images optimized before storage
- Appropriate Next Image `sizes`
- Team thumbnails use square optimized assets
- Hero uses responsive optimized source
- Public response excludes inactive/admin-only fields

## 21. Files Expected to Change

### New Files

```text
lib/about-page.ts
components/admin/AboutPageModule.tsx
app/api/about-page/route.ts
app/api/about-page/settings/route.ts
app/api/about-page/story/route.ts
app/api/about-page/story/reorder/route.ts
app/api/about-page/values/route.ts
app/api/about-page/values/reorder/route.ts
app/api/about-page/team/route.ts
app/api/about-page/team/reorder/route.ts
app/api/about-page/seed/route.ts
```

### Existing Files

```text
app/about/page.tsx
app/admin/page.tsx
```

## 22. Implementation Phases

### Phase 1 — Types and API

1. Shared types
2. Public/admin combined read
3. Settings endpoint
4. Story CRUD/reorder
5. Values CRUD/reorder
6. Team CRUD/reorder
7. Image management
8. Validation and authorization

### Phase 2 — Migration

1. Seed endpoint
2. Import current hero/team images
3. Seed settings, story, values and team
4. Verify counts and idempotency

### Phase 3 — Admin Module

1. Sidebar integration
2. Page/Hero panel
3. Story panel
4. Values panel
5. Team panel
6. Upload previews and progress
7. Empty/error/toast states

### Phase 4 — Storefront

1. Remove hard-coded content
2. Fetch dynamic payload
3. Render dynamic sections
4. Responsive team grid
5. Loading/error/empty states
6. Accessibility verification

### Phase 5 — Verification

1. CRUD tests
2. Reorder tests
3. Image replace/delete tests
4. Hidden content tests
5. Seed repeat test
6. ESLint
7. TypeScript
8. Production build
9. Desktop/mobile visual check

## 23. Acceptance Criteria

- Admin sidebar mein About Us module visible ho
- Hero text and managed image editable hon
- Story paragraphs fully dynamic hon
- Values fully dynamic and reorderable hon
- Team fully dynamic with managed uploads ho
- Hidden records storefront par na dikhein
- Reorder storefront par reflect ho
- Existing content database mein migrate ho
- No hard-coded team/story/value arrays remain
- Empty/error/loading states usable hon
- External editable image URLs removed hon
- Production build pass ho

## 24. Test Checklist

### Settings and Hero

- [ ] Settings save/load
- [ ] Hero replace/preserve
- [ ] Invalid image rejected
- [ ] Alt text renders
- [ ] Page/section visibility works

### Story

- [ ] Add/edit/hide/delete
- [ ] Reorder works
- [ ] Multiline text safe render

### Values

- [ ] Add/edit/hide/delete
- [ ] Icon validation and preview
- [ ] Reorder works

### Team

- [ ] Member create with image
- [ ] Text-only edit preserves image
- [ ] Image replacement cleans old asset
- [ ] Delete cleans image
- [ ] Hidden member removed publicly
- [ ] Responsive grid supports varying counts

### Migration and Reliability

- [ ] Current content seeded
- [ ] Repeat seed blocked
- [ ] Loading/error/retry works
- [ ] Admin mutations unauthorized requests reject
- [ ] ESLint/TypeScript/build pass

## 25. Final Recommendation

Implement one focused **About Us** admin module with four panels—Page & Hero, Brand Story, Brand Values and Team Members. Use structured plain-text records, managed optimized images, active visibility and batch-based ordering while preserving the current storefront design.
