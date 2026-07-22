# Dynamic FAQ Manager — Complete Implementation Plan

## 1. Goal

Current `/faq` page ka hard-coded content Firestore aur Admin Panel se fully manageable banana hai, jabke existing storefront design, search, category tabs aur accordion behavior preserve rahe.

Admin sidebar mein **FAQ Manager** module hoga. Is module ke andar do clear sections honge:

1. **FAQ Categories**
2. **Questions & Answers**

Admin bina code change kiye categories aur FAQs add, edit, hide, reorder aur delete kar sakega.

## 2. Current State

Current implementation `app/faq/page.tsx` mein:

- `faqData` hard-coded array hai.
- Categories hard-coded array mein hain.
- Search client-side static data par chalti hai.
- Category tabs static hain.
- FAQ accordion already functional hai.
- Banner aur bottom Contact CTA filhaal static rahenge.

Current page design ko rebuild nahi karna; data source ko dynamic karna hai.

## 3. Recommended Scope

### Included

- Dynamic FAQ categories
- Dynamic questions and answers
- Category assignment dropdown
- Active/Hidden status
- Display ordering
- Add, edit and delete actions
- Existing search support
- Existing accordion support
- Empty, loading and error states
- Current hard-coded FAQs ki one-time migration/seed
- Firestore-backed API
- Admin validation and storefront-safe filtering

### Not Included in First Version

- FAQ banner image management
- FAQ page heading management
- Bottom “Can’t find your answer?” CTA management
- Rich-text/WYSIWYG editor
- FAQ analytics
- Multiple languages
- Drag-and-drop sorting

Ye features future phase mein add ho sakte hain, lekin initial module ko simple aur reliable rakha jayega.

## 4. End-to-End Flow

```text
Admin → FAQ Manager
        ├── FAQ Categories
        │     └── Firestore: faq-categories
        └── Questions & Answers
              └── Firestore: faqs

Firestore/API
        ↓
/faq storefront
        ├── Dynamic category tabs
        ├── Dynamic FAQ accordion
        ├── Search questions + answers
        └── Active records only
```

## 5. Firestore Data Model

### Collection: `faq-categories`

Example document:

```json
{
  "id": "shipping",
  "name": "Shipping",
  "slug": "shipping",
  "order": 2,
  "active": true,
  "createdAt": "2026-07-21T10:00:00.000Z",
  "updatedAt": "2026-07-21T10:00:00.000Z"
}
```

Field rules:

- `id`: stable document ID
- `name`: customer-facing category name
- `slug`: normalized unique identifier
- `order`: display sequence
- `active`: storefront visibility
- `createdAt`, `updatedAt`: ISO timestamps

Recommended rule: category name editable ho, lekin create ke baad slug stable rakha jaye taake FAQ references break na hon.

### Collection: `faqs`

Example document:

```json
{
  "id": "faq-1721556000000",
  "categoryId": "shipping",
  "question": "How long does delivery take?",
  "answer": "Standard delivery takes 3–5 business days...",
  "order": 1,
  "active": true,
  "createdAt": "2026-07-21T10:00:00.000Z",
  "updatedAt": "2026-07-21T10:00:00.000Z"
}
```

Field rules:

- `id`: stable unique FAQ ID
- `categoryId`: `faq-categories` document reference by ID
- `question`: required customer-facing question
- `answer`: required plain-text answer
- `order`: category ke andar display order
- `active`: storefront visibility
- `createdAt`, `updatedAt`: ISO timestamps

Category name FAQ record mein duplicate save nahi hoga. Storefront category name `categoryId` ke through resolve karega.

## 6. Shared Type Definitions

New shared file recommended:

```text
lib/faq.ts
```

Types:

```ts
export interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqItem {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

Admin, API aur storefront same types reuse karenge.

## 7. API Design

Recommended endpoints:

```text
/api/faq-categories
/api/faqs
```

### `GET /api/faq-categories`

- Default: active categories only
- `?all=true`: admin ke liye active aur hidden dono
- Results `order` ascending mein

Response:

```json
{
  "success": true,
  "data": []
}
```

### `POST /api/faq-categories`

- New category create karega
- Name trim karega
- Slug safely generate karega
- Duplicate name/slug reject karega
- Default order last position hoga

### `PUT /api/faq-categories`

- Name, order aur active status update karega
- Existing ID required hoga
- Stable slug preserve karna recommended hai

### `DELETE /api/faq-categories?id={id}`

Category deletion se pehle assigned FAQs check hongi.

Recommended behavior:

- Agar category ke FAQs exist karte hain to deletion block ho.
- Admin ko message mile: “Move or delete assigned FAQs first.”
- Silent cascading delete nahi hogi.

### `GET /api/faqs`

Supported query parameters:

- `?all=true`: admin records including hidden
- `?categoryId=shipping`: category filter

Public response mein sirf:

- active FAQ
- active category se assigned FAQ

return hon.

### `POST /api/faqs`

- New FAQ create karega
- Valid active/existing `categoryId` required hoga
- Question aur answer required honge
- Default order selected category ke last mein hoga

### `PUT /api/faqs`

- Question, answer, category, order aur active status update karega
- Existing FAQ ID required hoga

### `DELETE /api/faqs?id={id}`

- Exact FAQ delete karega
- Confirmation admin UI mein required hogi

## 8. Validation Rules

### Category

- Name required
- Trimmed length: 2–60 characters
- Duplicate category name/slug not allowed
- Order non-negative integer
- Empty slug generate na ho to request reject

### FAQ

- Category required
- Question required
- Question recommended maximum: 200 characters
- Answer required
- Answer recommended maximum: 5,000 characters
- Whitespace-only values reject
- Order non-negative integer
- Referenced category exist karni chahiye

Server-side validation mandatory hai; sirf browser validation par depend nahi karna.

## 9. Admin Sidebar Integration

Admin sidebar mein **FAQ Manager** item add hoga.

Recommended placement:

```text
Collections
Reviews
FAQ Manager
Trust Benefits
```

Icon suggestion: `CircleHelp`, `HelpCircle` ya `MessageCircleQuestion` from Lucide.

Admin `activeTab` union mein `faq-manager` add hoga.

Page header:

```text
FAQ Manager
Manage customer questions, answers, categories, visibility, and ordering
```

## 10. FAQ Manager Admin UI

Recommended component:

```text
components/admin/FaqManagerModule.tsx
```

### Internal Tabs

- **Questions & Answers** — default
- **Categories**

### Categories Section

Category form:

```text
Category Name *  [ Shipping                     ]
Display Order    [ 2                            ]
Status           [ Active ▼                     ]
                  [ Add Category ]
```

Category list columns/cards:

- Name
- Slug
- FAQ count
- Order
- Active/Hidden
- Edit
- Delete
- Move up/down

### Questions & Answers Section

FAQ form:

```text
Category *       [ Shipping ▼                   ]
Question *       [ How long does delivery take? ]
Answer *         [ Standard delivery takes...   ]
Display Order    [ 1                            ]
Status           [ Active ▼                     ]
                  [ Save FAQ ]
```

FAQ list controls:

- Search by question/answer
- Filter by category
- Filter by Active/Hidden
- Edit
- Active/Hidden quick toggle
- Move up/down
- Delete with confirmation

List card/table information:

- Question
- Short answer preview
- Category name
- Status
- Order
- Actions

## 11. Admin UX Rules

- Save ke dauran button disabled aur spinner show ho.
- Successful action par existing admin toast system use ho.
- API error ka useful message show ho.
- Edit cancel action form reset kare.
- Category list empty ho to FAQ form disabled ho.
- Hidden category ko new FAQ assignment dropdown mein exclude karna recommended hai.
- Existing FAQ hidden category mein assigned ho to edit mode mein archived option visible rahe.
- Delete se pehle confirmation required ho.
- Reorder ke baad list immediately refresh/update ho.
- Multiple rapid submissions prevent hon.

## 12. Storefront `/faq` Integration

Current visual design preserve rahega.

### Page Load

Parallel requests:

```text
GET /api/faq-categories
GET /api/faqs
```

Ya future optimization mein combined public endpoint use ho sakta hai:

```text
GET /api/faqs?grouped=true
```

Initial implementation ke liye two-resource separation admin logic ko clearer rakhti hai.

### Dynamic Category Tabs

Hard-coded:

```ts
['All', 'Orders', 'Shipping', ...]
```

remove hoga.

Runtime tabs:

```text
All + active categories sorted by order
```

Tab selection stable category `id` use karegi, display name nahi.

### Dynamic FAQ List

Hard-coded `faqData` remove hogi.

- Active FAQ records load hongi.
- `categoryId` ke mutabiq group hongi.
- Category heading dynamic category name show karegi.
- Category order first priority hoga.
- FAQ order category ke andar apply hoga.

### Search

Existing client-side search preserve hogi:

- Question match
- Answer match
- Case insensitive
- Trimmed search query

Optional improvement: category name ko bhi search mein include kiya ja sakta hai.

### Accordion Keys

Current index-based key:

```ts
`${cat}-${i}`
```

replace hoga with stable FAQ ID:

```ts
faq.id
```

Is se reorder/filter ke waqt wrong accordion open state avoid hogi.

## 13. Storefront States

### Loading

- Search/tabs area ke neeche lightweight loading message ya skeleton
- Existing page header aur layout visible rahe

### No FAQs Configured

```text
No FAQs are available yet. Please contact our support team.
```

Contact CTA still visible rahegi.

### No Search Results

Existing message preserve:

```text
No questions match your search. Try another keyword.
```

### API Error

- Page crash nahi hogi
- Friendly retry state show hoga
- Retry button categories aur FAQs dobara fetch karega

## 14. Initial Data Migration

Current hard-coded categories:

- Orders
- Shipping
- Returns
- Payments
- Sizing

Current 11 FAQ records Firestore mein one time migrate honge.

Recommended migration options:

### Option A — Seed Endpoint (Recommended for This Project)

```text
POST /api/faqs/seed
```

- Only empty collections mein data create kare.
- Existing data ho to duplicate seed block kare.
- Admin-controlled/manual one-time action ho.
- Response created categories aur FAQ count return kare.

### Option B — Automatic First GET Seeding

Not recommended, kyun ke public read endpoint ka hidden write side-effect ho jayega.

### Migration Verification

- 5 categories create hon
- 11 FAQs create hon
- Current category and FAQ order preserve ho
- Current wording exactly preserve ho
- Seed repeat karne par duplicates create na hon

Seed complete hone aur production data verify hone ke baad hard-coded arrays remove hongi.

## 15. Ordering Strategy

First version mein explicit numeric order plus move up/down buttons use honge.

Category sorting:

```ts
order ascending → name ascending
```

FAQ sorting:

```ts
category order ascending → FAQ order ascending → createdAt ascending
```

Reorder action affected neighboring records ke order swap karegi. Duplicate order values API/display sort fallback se safely handle honge.

## 16. Delete and Referential Integrity

Important rule:

```text
FAQ Category → referenced by many FAQ records
```

Category delete flow:

1. Assigned FAQs count check
2. Count greater than zero ho to deletion reject
3. Admin assigned FAQs ko move ya delete kare
4. Empty category delete allow ho

Is approach se orphan FAQs create nahi hongi.

FAQ delete direct allowed hai after confirmation.

## 17. Security

Target production behavior:

- Public users: active categories/FAQs read only
- Admin users: create/update/delete
- API admin mutations authentication/authorization verify karein
- Request payload whitelist ho
- Client-provided timestamps blindly trust na hon
- Firestore rules production se pehle open sandbox rule se restrict hon

Current project sandbox rules broad hain; feature implementation ke saath production-hardening note clearly document/test karna hoga.

## 18. Accessibility

- Accordion buttons real `<button>` elements rahenge.
- `aria-expanded` FAQ open state reflect kare.
- Answer container ko stable ID mile.
- Button `aria-controls` answer ID reference kare.
- Keyboard navigation naturally supported ho.
- Active category tab `aria-pressed` or tab semantics expose kare.
- Form labels inputs ke saath correctly associated hon.
- Status sirf color ke through communicate na ho.

## 19. Performance

- Categories aur FAQs parallel fetch hon.
- Public API only active required fields return kare.
- Admin `all=true` complete records return kare.
- Firestore queries/order indexes required hon to index add kiya jaye.
- FAQ list expected small hone ki wajah se client-side search appropriate hai.
- Very large FAQ library future mein server search/pagination demand kar sakti hai.

## 20. Files Expected to Change

### New Files

```text
lib/faq.ts
app/api/faq-categories/route.ts
app/api/faqs/route.ts
app/api/faqs/seed/route.ts
components/admin/FaqManagerModule.tsx
```

### Existing Files

```text
app/admin/page.tsx
app/faq/page.tsx
firestore.rules (production hardening phase)
```

Optional split if component becomes large:

```text
components/admin/FaqCategoriesPanel.tsx
components/admin/FaqQuestionsPanel.tsx
```

## 21. Implementation Phases

### Phase 1 — Models and API

1. Shared FAQ types create karna
2. FAQ categories CRUD API
3. FAQs CRUD API
4. Validation and duplicate checks
5. Category reference/delete protection
6. API response/error format standardize karna

### Phase 2 — Seed and Migration

1. Current categories seed data prepare karna
2. Current FAQs seed data prepare karna
3. Idempotent seed endpoint create karna
4. Firestore seed execute karna
5. Record counts/order verify karna

### Phase 3 — Admin Module

1. Sidebar `FAQ Manager` tab
2. Page header and description
3. Categories panel
4. Questions & Answers panel
5. Add/edit/delete/toggle/reorder actions
6. Search and filters
7. Loading, error and empty states

### Phase 4 — Storefront Integration

1. Hard-coded categories remove karna
2. Hard-coded FAQ data remove karna
3. Dynamic fetch
4. Dynamic tabs and grouping
5. Existing search connect karna
6. Stable accordion IDs
7. Loading/error/empty/retry states
8. Accessibility attributes

### Phase 5 — Verification

1. TypeScript/build check
2. CRUD manual testing
3. Category reference protection testing
4. Storefront filtering/search testing
5. Mobile/desktop visual regression check
6. Seed idempotency test
7. Hidden records visibility test

## 22. Acceptance Criteria

Feature complete tab mana jayega jab:

- Admin sidebar mein FAQ Manager visible ho.
- Admin category add, edit, hide, reorder aur delete kar sake.
- Admin FAQ add, edit, hide, reorder, category-change aur delete kar sake.
- Assigned FAQs wali category accidentally delete na ho.
- Product/storefront ke unrelated modules impact na hon.
- `/faq` par categories Firestore se dynamically show hon.
- `/faq` par FAQs Firestore se dynamically show hon.
- Search question aur answer dono par work kare.
- Category tabs correct FAQs filter karein.
- Hidden categories aur FAQs public page par show na hon.
- FAQ order admin configuration ke mutabiq ho.
- Current 11 FAQs successfully migrate hon.
- Empty/error/loading states usable hon.
- Production build pass ho.

## 23. Test Checklist

### Admin Categories

- [ ] New valid category create hoti hai
- [ ] Duplicate category reject hoti hai
- [ ] Category rename hoti hai
- [ ] Active/Hidden toggle work karta hai
- [ ] Order change storefront par reflect hota hai
- [ ] Empty category delete hoti hai
- [ ] Assigned FAQs wali category deletion block hoti hai

### Admin FAQs

- [ ] Valid FAQ create hota hai
- [ ] Missing category reject hoti hai
- [ ] Missing question/answer reject hota hai
- [ ] FAQ edit save hota hai
- [ ] FAQ category change hoti hai
- [ ] FAQ hide karne par storefront se remove hota hai
- [ ] FAQ order change reflect hota hai
- [ ] Delete confirmation aur deletion work karti hai

### Storefront

- [ ] All tab all active FAQs show karta hai
- [ ] Category tab correct FAQs show karta hai
- [ ] Search question match karta hai
- [ ] Search answer match karta hai
- [ ] No-result message correct hai
- [ ] Accordion open/close stable hai
- [ ] Reorder/filter ke baad wrong item open nahi hota
- [ ] Hidden category/FAQ visible nahi
- [ ] Contact CTA remains visible
- [ ] Mobile horizontal category tabs usable hain

### Migration and Reliability

- [ ] 5 existing categories migrate hoti hain
- [ ] 11 existing FAQs migrate hote hain
- [ ] Seed second run duplicates create nahi karta
- [ ] API failure page crash nahi karti
- [ ] Retry data reload karta hai
- [ ] `npm run build` passes

## 24. Future Enhancements

First version stable hone ke baad optionally:

- FAQ page banner/title admin settings
- Contact CTA text/link settings
- Rich-text answers
- Internal page/product links
- Featured FAQs
- FAQ view/open analytics
- Drag-and-drop ordering
- Urdu/English translations
- Customer group-specific FAQs
- SEO FAQ structured data (`FAQPage` JSON-LD), subject to current search-engine guidelines

## 25. Final Recommended Build Decision

Implement **FAQ Manager** with separate `faq-categories` and `faqs` collections, stable category references, plain-text answers, active status, numeric ordering, idempotent migration seed, and the current storefront design preserved.

Ye architecture current store ke liye simple admin experience deta hai aur future enhancements ke liye clean foundation rakhta hai.
