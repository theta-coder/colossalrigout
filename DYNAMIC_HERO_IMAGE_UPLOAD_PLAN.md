# Hero Slides — File Upload and Automatic Alignment Plan

## Goal

Hero Slides admin module se manual **Background Image URL** aur **Image Alignment** inputs remove karne hain.

Admin/client sirf apne computer ya device se hero image select karega. System image upload, storage, optimization, responsive cropping aur alignment automatically manage karega.

## Final Admin Experience

Hero form mein client ko sirf yeh relevant controls milenge:

- Hero image file selector
- Selected image preview
- Slide title
- Slide subtitle
- CTA button information
- Sequential order

Client ko yeh fields nahi deni:

- Background Image URL
- Image Alignment
- Tailwind classes such as `object-center` or `object-[72%_30%]`
- External image link
- Storage path/download URL

## Background Image URL Logic Remove Karna

- Existing **Background Image URL** text input completely remove hoga.
- Admin form external `https://...` image links accept nahi karega.
- Hero create/edit payload mein user-entered `image` URL supported nahi hoga.
- Existing URL-based image assignment code remove hoga.
- Admin ko Firebase Storage path ya generated download URL manually edit karne ka option nahi milega.

## Hero Image File Field

URL input ki jagah file selector add hoga:

```html
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
/>
```

### Create Slide Behavior

- Admin device se image select karega.
- File select hote hi form mein local preview show hoga.
- New slide create karne ke liye image required hogi.
- Save ke waqt upload progress aur disabled submit state show hogi.
- Upload successful hone ke baad slide database mein save hogi.
- Upload fail ho to incomplete slide record create nahi hoga.

### Edit Slide Behavior

- Existing stored hero image preview show hogi.
- New image select karna optional hoga.
- New image select na ho to current image preserve hogi.
- New image select ho to pehle new file upload hogi.
- Database update successful hone ke baad old image file Storage se delete hogi.
- Failed replacement ki situation mein old working image preserve rahegi.

## Image Storage Architecture

Image binary ko Firestore document mein Base64 ke taur par save nahi karna. Correct structure:

```text
Admin selects hero image
        ↓
Client preview
        ↓
Server validates/optimizes file
        ↓
Firebase Storage stores actual image binary
        ↓
Firestore hero slide stores managed image reference
        ↓
Homepage renders stored hero image
```

### Storage Data

Actual image file:

```text
Firebase Storage: hero-slides/{slideId}/{uniqueFileName}.webp
```

Firestore hero slide record:

```json
{
  "id": "slide-id",
  "imagePath": "hero-slides/slide-id/unique-file.webp",
  "imageUrl": "system-generated-rendering-url",
  "title": "WEAR YOUR CONFIDENCE",
  "subtitle": "...",
  "order": 0
}
```

- `imagePath` primary managed reference hoga.
- `imageUrl`, agar frontend rendering ke liye required ho, system generate karega.
- `imageUrl` user input field nahi hoga.
- Original local path ya filename database identity ke liye use nahi hoga.

## Multipart Upload API

- Hero create/update API `multipart/form-data` accept karegi.
- Request mein slide text fields aur image file send honge.
- API responsibilities:
  - admin authorization verify karna
  - file validate karna
  - image optimize karna
  - Firebase Storage upload karna
  - generated storage reference Firestore mein save karna
  - update/delete par old file cleanup karna
- Partial failure par database aur Storage ko consistent rakhna hoga.

## Automatic Image Alignment

Existing **Image Alignment** input completely remove hoga. Client ko CSS/Tailwind alignment samajhne ya enter karne ki zaroorat nahi hogi.

### Default Rendering Rule

Har uploaded hero image ke liye safe defaults code mein fixed honge:

```text
Desktop: object-fit cover + object-position center
Tablet:  object-fit cover + object-position center
Mobile:  object-fit cover + object-position center
```

- Alignment database/form field nahi hoga.
- `objectPosition` ya Tailwind class admin payload se accept nahi hogi.
- Homepage component controlled CSS classes use karega.
- Invalid custom alignment class inject nahi ki ja sakegi.

### Recommended Automatic Crop Strategy

Upload pipeline image ko hero usage ke liye automatically prepare kare:

- Original aspect ratio inspect karna
- Consistent wide desktop variant create karna
- Mobile-friendly portrait/square variant create karna where supported
- Center-based smart crop as default
- Important content ko preserve karne ke liye optional automatic subject/focal-point detection
- Generated variants ko Storage mein save karna

Recommended variants:

| Variant | Suggested dimensions | Usage |
|---|---:|---|
| Desktop | 1920×800 | Wide screens |
| Tablet | 1200×800 | Medium screens |
| Mobile | 750×1000 | Mobile hero |

Browser `<picture>`/responsive source logic ke through correct variant automatically select karega.

### Simple First-Version Option

Agar automatic subject detection first release ke scope se bahar ho, system yeh deterministic behavior use karega:

- Center crop
- `object-fit: cover`
- No admin alignment field
- Image upload instructions mein recommended dimensions show hongi
- Preview desktop aur mobile frame mein show hogi taa-ke save se pehle result visible ho

## Upload Validation

- Allowed formats: JPEG, PNG and WebP.
- Recommended maximum original size: 10 MB.
- MIME type aur actual file signature validate honge.
- Minimum dimensions validate hongi, recommended at least 1600×700.
- Extremely small/corrupt files reject hongi.
- System-generated unique filename use hoga.
- Server metadata/unsafe filename par depend nahi karega.
- Upload ke baad compression aur WebP conversion recommended hai.

## Preview Experience

Form mein file select karne ke baad:

- Desktop hero preview
- Mobile hero preview
- Loading/upload percentage
- Replace image action
- Validation message

Preview automatic center crop ke exact expected output ko represent karegi. Client ko alignment field adjust karne ki zaroorat nahi hogi.

## Existing Slides Migration

Current hero slides external image URLs use kar rahe hain. URL logic completely remove karne se pehle migration required hogi:

1. Existing hero image files authorized migration process se retrieve karna.
2. Files validate aur optimize karna.
3. Firebase Storage ke `hero-slides` path mein upload karna.
4. Firestore documents mein `imagePath`/managed reference save karna.
5. Old `image` URL and `objectPosition` fields remove karna.
6. Homepage rendering verify karna.

Migration failure par working old reference tab tak remove nahi hogi jab tak new Storage upload verified na ho.

## Restore Default Slides

- “Restore Default Slides” URL-based Unsplash records create nahi karega.
- Default hero images project-owned seed assets ya Firebase Storage assets hongi.
- Reset operation managed image references use karegi.
- Repeated reset orphaned/duplicate image files create nahi karega.

## Delete and Cleanup

- Slide delete hone par associated Storage files/variants bhi delete honge.
- Image replacement par previous file cleanup hogi.
- Shared default assets ko delete karne se protect kiya jayega.
- Failed operations ke orphaned uploads identify/cleanup karne ka safe mechanism hoga.

## Security

- Sirf authenticated/authorized admin upload, replace aur delete kar sakega.
- Storefront hero images ko public read access milegi.
- Firebase Storage rules path, file type aur size restrict karengi.
- Firestore rules admin-only hero mutations enforce karengi.
- External URL, custom storage path aur alignment class injection reject hogi.

## Loop Engineering Plan

### Loop 1 — Current Flow Audit

- Hero form, Firestore schema, homepage rendering and reset seeding trace karna.
- URL and `objectPosition` ke tamam references locate karna.
- Existing slide migration inventory prepare karna.

Exit: affected files and legacy data known hon.

### Loop 2 — Storage Upload Foundation

- Firebase Storage integration configure karna.
- File validation and upload service/API create karna.
- Managed `imagePath` schema implement karna.
- Authorization and Storage rules add karna.

Exit: valid image safely upload aur reference save ho.

### Loop 3 — Admin Form Simplification

- Background Image URL field remove karna.
- Image Alignment field remove karna.
- File selector, preview, progress and replace behavior add karna.
- Create/edit form ko multipart upload se connect karna.

Exit: client URL/alignment enter kiye baghair slide manage kar sake.

### Loop 4 — Automatic Responsive Rendering

- Fixed safe alignment CSS add karna.
- Responsive image/crop variants implement karna.
- Desktop and mobile preview rendering match karna.
- Homepage component legacy alignment fields se independent karna.

Exit: uploaded image all target breakpoints par automatically fit ho.

### Loop 5 — Migration and Reset Logic

- Existing URL images managed Storage assets mein migrate karna.
- Legacy `image` URL and `objectPosition` data remove karna.
- Restore Default Slides ko local/managed assets par move karna.

Exit: production flow mein external URL/alignment dependency na ho.

### Loop 6 — QA

- Create slide with local file
- Edit without changing image
- Replace image and verify old-file cleanup
- Delete slide and verify Storage cleanup
- Invalid type/size/dimensions rejection
- Desktop/tablet/mobile crop verification
- Restore default slides test
- API authorization test
- TypeScript, lint and production build

Exit: complete hero image lifecycle verified ho.

## Acceptance Criteria

- Hero form mein Background Image URL field na ho.
- Hero form mein Image Alignment field na ho.
- Hero image device file selector se upload ho.
- External image URLs API payload mein accept na hon.
- Actual image file Firebase Storage mein save ho.
- Firestore slide record managed storage reference use kare.
- Homepage automatic safe center crop/alignment use kare.
- Client ko CSS/Tailwind class enter na karni pade.
- Create, edit, replace, delete and reset flows Storage cleanup handle karein.
- Existing URL-based slides successfully migrate hon.
- Desktop and mobile rendering visually verified ho.
- Production build pass kare.

## Scope Note

Yeh file sirf implementation plan hai. Is stage par Hero form, API, Firebase Storage, Firestore data ya frontend code modify nahi kiya jayega.
