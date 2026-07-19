# Dynamic Product Categories — Implementation Plan

## Goal

Admin ke **Add New Product** aur **Edit Product** forms mein category dropdown static array se nahi, balkay existing **Shop Categories database/API** se load hoga.

Homepage categories, product categories aur Shop page filters bilkul same database records use karenge. Admin ko **Destination Link** manually enter nahi karna hoga; category slug se link automatically generate hoga.

## Core Rule: One Category, One Slug, Everywhere

Har jagah ek hi category identity use hogi:

- Admin Shop Categories list
- Homepage “Shop by Category” cards
- Add/Edit Product category dropdown
- Shop page category filters
- Product ka saved category reference
- Category card ka automatic URL

Example:

```text
Category name: Tops
Category slug: tops
Automatic link: /shop?cat=tops
Product value: categorySlug = tops
Shop filter: cat=tops
```

Is flow mein alag display category, product category ya shop-filter category create nahi hogi.

## Expected Flow

```text
Shop Categories Admin Module
        ↓
Firestore: shop-categories
        ├── Homepage category cards
        ├── Add/Edit Product dropdown
        └── Shop page category filters

Category click → /shop?cat={slug} → matching products automatically filtered
```

## Destination Link Field Remove Karna

- Shop Category create/edit form se **Destination Link** field completely remove hogi.
- Category database model mein manually editable `link` field ki zaroorat nahi hogi.
- Frontend category link runtime par slug se generate hoga:

```ts
`/shop?cat=${category.slug}`
```

- Optional source query jaise `fromHome=true` filtering ke liye required nahi hogi; analytics requirement ho to code internally append kar sakta hai.
- Admin kisi invalid ya mismatched link ko save nahi kar sakega.
- Category slug change hone par generated link automatically update ho jayega.

## Category Image: File Upload, External Link Nahi

Category form mein **Category Image URL** field bhi completely remove hogi. Admin image ka link paste nahi karega; image apne computer/device se select aur upload karega.

### Admin Form Behavior

- `Category Image URL` text input remove hoga.
- Uski jagah file field hoga:

```html
<input type="file" accept="image/jpeg,image/png,image/webp" />
```

- File select karte hi local preview show hoga.
- Create category mein image required hogi, siwaye special `sale` style ke agar usmein image use nahi hoti.
- Edit category mein existing image preview show hoga.
- Edit ke waqt new file select na ho to existing image preserve hogi.
- New file select ho to upload complete hone ke baad old image replace hogi.
- Remove/replace actions clear confirmation aur progress state ke sath hongi.

### Image Storage Architecture

Image binary ko Firestore document ke andar Base64/string bana kar save nahi kiya jayega, kyun ke is se document size, performance aur cost issues aate hain. Correct flow:

```text
Admin selects image file
        ↓
Server validates file
        ↓
Firebase Storage mein binary upload
        ↓
Firestore category document mein managed storage path/reference save
        ↓
Frontend reference se category image render kare
```

- Actual image file Firebase Storage mein save hogi.
- Firestore category record mein user-entered external URL nahi, system-generated fields save honge:
  - `imagePath`: Storage object path, e.g. `categories/tops/uuid.webp`
  - `imageUrl`: optional system-generated download URL, sirf rendering ke liye
  - `imageAlt`: category name se generated accessible text
- Admin ko URL enter/edit karne ka option nahi milega.
- Application upload ke baad storage reference automatically database mein associate karegi.

### Upload API

- Category create/update request `multipart/form-data` use karegi.
- API text fields aur selected image file ek request flow mein handle karegi.
- Server upload successful hone ke baad hi category image reference save karega.
- Agar upload fail ho to incomplete category/image reference save nahi hoga.
- Update flow mein pehle new image upload hogi; database update successful hone ke baad old Storage file safely delete hogi.
- Category delete par associated Storage image bhi cleanup hogi.

### File Validation

- Allowed formats: JPEG, PNG and WebP.
- MIME type aur actual file signature validate honge; sirf filename extension trust nahi hogi.
- Recommended maximum upload size: 5 MB.
- Oversized/invalid files user-friendly error ke sath reject hongi.
- Filename system-generated unique ID se banega; original filename directly storage path nahi banega.
- Optional image optimization:
  - resize to category-card requirement
  - WebP conversion
  - compression
  - consistent square aspect ratio or controlled crop

### Security

- Sirf authenticated/authorized admin category images upload, replace ya delete kar sakega.
- Public storefront ko category images read access milegi.
- Storage rules file type, maximum size aur category path restrict karengi.
- Arbitrary external image URLs category payload mein accept nahi hongi.
- API supplied `imageUrl`/`imagePath` ko blindly trust nahi karegi.

## Implementation Steps

### 1. Existing Static Source Remove Karna

- `app/admin/page.tsx` mein hard-coded `defaultCategories` array identify karni hai.
- Product form ke `<select>` se static `.map()` remove karna hai.
- Product form ka current category default (`Shirts`) bhi hard-coded nahi rehna chahiye.

### 2. Categories API Ko Single Source of Truth Banana

- Existing `/api/categories` endpoint use hoga.
- Admin product form ke liye API active categories return karegi.
- Categories `order` field ke mutabiq sort hongi.
- Required response fields:
  - `id`
  - `name`
  - `slug`
  - `imagePath`
  - system-generated `imageUrl` where required for rendering
  - `active`
  - `order`
  - `style`
- `link` API/database ka required user-managed field nahi hoga.
- External/user-entered `image` URL API/database ka supported field nahi hoga.

### 3. Shared Category State Add Karna

- Admin dashboard mein categories state add/use hogi:
  - `productCategories`
  - `categoriesLoading`
  - `categoriesError`
- Admin load hone par categories fetch hongi.
- Shop Categories module mein add/edit/delete/toggle ke baad same state refresh hogi.
- Duplicate API requests avoid karne ke liye existing categories state reuse karna preferred hoga.

### 4. Product Dropdown Dynamic Karna

- Dropdown options API se milne wali active categories se generate hongi.
- Option label: category `name`
- Option value: category `slug`
- Dropdown order Shop Categories module ke display order jaisa hoga.
- Inactive categories new product ke dropdown mein show nahi hongi.
- `sale` jaisi promotional category ko product assignment ke liye allow karna ya exclude karna business rule ke mutabiq configure hoga; recommended: `sale` ko exclude karein kyun ke sale product status/price se derive honi chahiye.

### 5. Add Product Behavior

- Categories load hone tak dropdown disabled rahega.
- Load complete hone par first valid active category default select hogi.
- Agar koi active category available na ho:
  - Dropdown disabled hoga.
  - “Create an active category first” message show hoga.
  - Product submission category ke baghair block hogi.

### 6. Edit Product Compatibility

- Existing product ka saved category slug select hoga.
- Agar existing product ki category inactive ya delete ho chuki ho:
  - Existing value temporary “Archived category” option ke taur par show hogi.
  - Admin ko valid active category select karne ka prompt milega.
  - Product data silently kisi aur category mein move nahi hoga.

### 7. Product Data Standardize Karna

- Product ke `cat` field mein display name ke bajaye stable category `slug` save karna recommended hai.
- Example:

```json
{
  "name": "Casual Cotton Shirt",
  "cat": "tops"
}
```

- UI par category name slug se resolve hoga.
- Category rename karne par products break nahi honge kyun ke slug stable rahega.
- Slug edit allow ho to dependent products migration strategy required hogi; recommended: category create hone ke baad slug immutable rakhein.

### 8. Shop Filtering Alignment

- Homepage category card ka URL category slug se automatically generate hoga.
- Shop page ke filters bhi same active `shop-categories` API/database collection se dynamically generate honge.
- Homepage category link ka `cat` query parameter aur product ka category slug identical hoga.
- `/shop?cat=tops` sirf `cat: "tops"` products filter kare.
- URL mein valid category slug aaye to matching category automatically selected/highlighted hogi.
- Invalid ya deleted slug aaye to Shop page safe “All Products” state ya clear empty state show karega.
- Case-insensitive legacy comparison temporary migration compatibility ke liye rakhi ja sakti hai.

### 8.1 Shop Page Par Same-to-Same Categories

- Homepage aur Shop page categories ke liye separate arrays nahi hongi.
- Dono views same category `name`, `slug`, `active` aur `order` fields use karenge.
- Active category homepage aur Shop page dono par show hogi.
- Inactive category dono public views se hide hogi.
- Category order dono jagah consistent hoga.
- Shop page par category click/query selected category ke products filter karega.
- Product count optional derived value hoga; category identity ko change nahi karega.

### 9. Existing Product Migration

- Current values jaise `Shirts`, `T-Shirts`, `Bottoms` ko new category slugs se map karna hoga.
- Example migration map:

| Existing value | New slug |
|---|---|
| `Shirts` | `tops` or `shirts` |
| `T-Shirts` | `tops` or `t-shirts` |
| `Bottoms` | `bottoms` |
| `Outerwear` | `outerwear` |
| `Shoes` | `shoes` |
| `Accessories` | `accessories` |
| `Kids` | `kids` |

- Final mapping available Shop Categories records dekh kar approve hogi.
- Migration se pehle backup/export recommended hai.

### 10. Validation

- Product create/update API verify kare ke submitted category slug database mein exist karti hai.
- Category active honi chahiye for new products.
- Invalid/manually injected category reject ho.
- Server-side validation frontend dropdown par depend na kare.

## Loop Engineering Plan

### Loop 1 — Inspect and Map

- Static category references search karna.
- Product create/edit/save/filter flows trace karna.
- Existing category slugs aur product category values compare karna.

Exit: migration map aur exact affected files known hon.

### Loop 2 — Dynamic Dropdown

- Categories state/API integration add karna.
- Add/Edit Product dropdown dynamic karna.
- Loading, empty and error states implement karna.

Exit: static dropdown completely removed ho.

### Loop 3 — Category File Upload

- Image URL field remove karna.
- File selector, preview, validation and upload progress add karna.
- Firebase Storage upload service/API implement karna.
- Firestore mein managed image path/reference save karna.
- Replace/delete ke waqt old Storage files cleanup karna.
- Storage security rules verify karna.

Exit: category image device se upload ho, database record se associate ho aur koi manual image link required na ho.

### Loop 4 — Automatic Links and Dynamic Shop Filters

- Destination Link field admin form aur payload se remove karna.
- Homepage links slug se generate karna.
- Shop filter options categories API se generate karna.
- URL query aur selected filter state synchronize karna.

Exit: category click matching Shop filter automatically activate kare aur manually saved link kahin use na ho.

### Loop 5 — Save Validation and Compatibility

- Product API validation add karna.
- Edit-product archived category case handle karna.
- Category refresh synchronization verify karna.

Exit: invalid category save na ho aur existing products safely edit hon.

### Loop 6 — Migration and Shop Filters

- Legacy product categories migrate karna.
- Homepage links, shop filters and product category slugs align karna.

Exit: category click correct products return kare.

### Loop 7 — QA

- Category create → product dropdown test
- Local image select → preview → upload → storefront rendering test
- Invalid type and oversized image rejection test
- Category image replacement and old-file cleanup test
- Category deletion and associated-file cleanup test
- Category create → homepage and Shop filter appearance test
- Homepage category click → same Shop category selected test
- Confirm generated URL uses exact saved slug
- Category deactivate → dropdown removal test
- Category deactivate → homepage and Shop filter removal test
- Product create/edit test
- Deleted/archived category product test
- Shop filtering test
- TypeScript, lint and production build test

Exit: complete category-to-product flow passes.

## Acceptance Criteria

- Product form mein koi hard-coded category option na ho.
- Shop page par koi hard-coded category filter option na ho.
- Homepage, Product form aur Shop page same category records use karein.
- Admin Category form mein Destination Link field na ho.
- Admin Category form mein Image URL field na ho.
- Category image local file selector se upload ho.
- Actual file Firebase Storage mein aur managed reference category database record mein save ho.
- Admin ko external image URL paste/edit karne ki zaroorat ya permission na ho.
- Invalid/oversized image uploads reject hon.
- Image replacement/deletion orphaned Storage files na chhore.
- Category link slug se automatically generate ho.
- Homepage category click par same Shop category automatically filter/select ho.
- New active admin category dropdown mein automatically appear ho.
- Inactive category new products ke liye available na ho.
- Selected category stable slug ke sath product mein save ho.
- Edit form correct existing category select kare.
- Empty/loading/error states clear hon.
- API invalid category reject kare.
- Category links and shop product filters consistent hon.
- Existing product data migration ke baad accessible rahe.

## Scope

Yeh document sirf planning ke liye hai. Is step mein code, API, database ya existing records modify nahi kiye jayenge.
