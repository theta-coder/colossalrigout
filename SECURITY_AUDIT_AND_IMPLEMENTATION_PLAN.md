# Colossal Rigout — Security Audit & Implementation Plan

> **Generated:** 2026-07-23
> **Project:** colossal-rigout (Next.js 15 + Firebase + TypeScript e-commerce)
> **Severity Scale:** CRITICAL > HIGH > MEDIUM > LOW

---

## Executive Summary

This audit identified **5 critical, 4 high, 4 medium, and 3 low** severity issues. The most dangerous findings are:

1. Firestore rules are wide open (`allow read, write: if true`) — **anyone on the internet can read/modify/delete all data**.
2. User passwords are stored in **plaintext** inside Firestore.
3. Admin authentication can be **bypassed with a simple HTTP header** (`x-admin-demo: 1`).
4. No Next.js middleware exists — admin routes are unprotected at the edge.
5. An "offline login" feature creates fake sessions with no real authentication.

**These issues must be fixed before any production deployment.**

---

## Table of Contents

1. [Critical Vulnerabilities](#1-critical-vulnerabilities)
2. [High Vulnerabilities](#2-high-vulnerabilities)
3. [Medium Vulnerabilities](#3-medium-vulnerabilities)
4. [Low Vulnerabilities](#4-low-vulnerabilities)
5. [Security Headers Checklist](#5-security-headers-checklist)
6. [Step-by-Step Implementation Guide](#6-step-by-step-implementation-guide)
7. [Firebase Firestore Rules (Production-Ready)](#7-firebase-firestore-rules-production-ready)
8. [Next.js Middleware](#8-nextjs-middleware)
9. [Input Validation & Sanitization](#9-input-validation--sanitization)
10. [Rate Limiting](#10-rate-limiting)
11. [Post-Fix Testing Checklist](#11-post-fix-testing-checklist)

---

## 1. Critical Vulnerabilities

### CRITICAL-01: Firestore Rules Are Fully Open

**File:** `firestore.rules`
**Current code:**
```
match /{document=**} {
  allow read, write: if true;
}
```
**Impact:** Anyone with your Firebase project ID (which is embedded in the client config) can read, create, update, or delete **any document** in your entire database — user profiles, orders, admin records, promotions, inventory, everything.

**Fix:** Replace with collection-level rules (see [Section 7](#7-firebase-firestore-rules-production-ready)).

---

### CRITICAL-02: Passwords Stored in Plaintext

**File:** `context/AuthContext.tsx` (lines 178, 210)
**Current code:**
```ts
await setDoc(userRef, {
  uid: user.uid,
  name: cleanName,
  email: cleanEmail,
  password: cleanPassword,  // <-- PLAINTEXT PASSWORD IN DATABASE
  createdAt: new Date().toISOString()
}, { merge: true });
```
Also stored in the Firestore fallback signup (line 210) and checked in the fallback login (line 131):
```ts
if (!userData.password || userData.password === cleanPassword)
```
**Impact:** If your Firestore is ever exposed (and right now it is — see CRITICAL-01), every user password is readable in plaintext. Password reuse means attackers can compromise users' other accounts.

**Fix:**
- Remove the `password` field from Firestore writes entirely.
- Use **Firebase Authentication exclusively** for password verification — never store or compare passwords yourself.
- Delete the Firestore fallback login/signup paths — they are insecure by design.
- Force a password reset for all existing users since their passwords may already be compromised.

---

### CRITICAL-03: Admin Auth Bypass via HTTP Headers

**File:** `lib/serverAuth.ts` (`requireAdmin` function)
**Current code:**
```ts
const isMasterAdmin =
  request.headers.get('x-admin-demo') === '1' ||
  request.headers.get('x-admin-master') === '1';

if (isMasterAdmin) {
  return { uid: 'master-admin-session', email: 'who1sdanish011@gmail.com' };
}
```
**Impact:** Any attacker can send a request with the header `x-admin-demo: 1` or `x-admin-master: 1` and gain **full admin access** to every admin API route — manage orders, reviews, storefront settings, contact inquiries, and more.

**Fix:**
- Remove the header-based bypass **completely**.
- Admin access must only be granted after Firebase token verification + Firestore `/admins/{uid}` document check.
- There should be **no backdoor** — not even in development. Use environment-based seeding instead.

---

### CRITICAL-04: No Next.js Middleware for Route Protection

**Finding:** No `middleware.ts` file exists in the project root.

**Impact:** The `/admin` pages and `/api/admin/*` routes have no edge-level protection. Even if API routes check tokens (which they do weakly — see CRITICAL-03), the admin **pages** are accessible to anyone, and there is no redirect logic for unauthenticated users.

**Fix:** Add `middleware.ts` that:
- Checks for a Firebase session cookie or token on `/admin/*` routes.
- Redirects unauthenticated users to `/admin/login`.
- Blocks `/api/admin/*` routes at the edge if no token is present (defense in depth).

See [Section 8](#8-nextjs-middleware).

---

### CRITICAL-05: Offline / Fake Login Creates Sessions Without Authentication

**File:** `context/AuthContext.tsx` (`loginOffline` function, line 310)
**Current code:**
```ts
const loginOffline = async (name: string, email: string) => {
  const cleanName = name.trim() || 'Demo User';
  const cleanEmail = email.trim() || 'demo@colossalrigout.pk';
  const localUser = { name: cleanName, email: cleanEmail, uid: 'offline_demo_user' };
  localStorage.setItem('cr_local_user', JSON.stringify(localUser));
  setCurrentUser(localUser);
  return { success: true, message: '...' };
};
```
**Impact:** Anyone can "log in" with any name/email — no password, no Firebase Auth, no verification. The session is purely client-side via localStorage, but if any UI logic trusts `currentUser` from this context, it can be spoofed.

Also, the Google sign-in fallback (line 270) creates Firestore user documents with random UIDs (`goog_${timestamp}_${random}`) without any real Google authentication — just typing an email in a `window.prompt`.

**Fix:**
- Remove `loginOffline` entirely.
- Remove the Google OAuth fallback that creates users from `window.prompt`.
- If a demo/offline mode is needed for development, gate it behind `process.env.NODE_ENV === 'development'` and ensure it never runs in production builds.

---

## 2. High Vulnerabilities

### HIGH-01: Client-Side Admin API Helper Sends Demo Header in Dev

**File:** `lib/admin-api.ts`
**Current code:**
```ts
if (process.env.NODE_ENV !== 'production' && !token) {
  headers.set('x-admin-demo', '1');
}
```
**Impact:** In any non-production environment (staging, preview deployments), admin API calls automatically bypass authentication. If staging is publicly accessible, admin is fully open.

**Fix:** Remove the `x-admin-demo` header injection. Always require a real Firebase ID token.

---

### HIGH-02: Firestore Fallback Login Compares Plaintext Passwords

**File:** `context/AuthContext.tsx` (lines 126-148)
**Current code:**
```ts
const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
if (!usersSnap.empty) {
  const userData = userDoc.data();
  if (!userData.password || userData.password === cleanPassword) {
    // login successful
  }
}
```
**Impact:** If a user document has no `password` field (`!userData.password`), **login succeeds with any password**. Combined with CRITICAL-01 (open Firestore), an attacker can create a user document without a password field and then log in.

**Fix:** Remove the entire Firestore fallback login. Use Firebase Authentication only.

---

### HIGH-03: No Content-Security-Policy (CSP) Header

**File:** `next.config.ts`
**Finding:** Security headers like `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`, and `Permissions-Policy` are present (good!), but **Content-Security-Policy is missing**.

**Impact:** Without CSP, the app is vulnerable to injected scripts (XSS). If an attacker injects a `<script>` tag or inline event handler, the browser will execute it.

**Fix:** Add a CSP header in `next.config.ts` headers configuration:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.gstatic.com wss://*.firebaseio.com; frame-src https://*.firebaseapp.com;
```
> Note: `'unsafe-inline'` and `'unsafe-eval'` should be replaced with nonces/hashes in production for maximum security. See [Section 5](#5-security-headers-checklist).

---

### HIGH-04: No Rate Limiting on API Routes

**Finding:** API routes like `/api/checkout`, `/api/contact-inquiries`, `/api/admin/*`, and authentication endpoints have no rate limiting.

**Impact:** Attackers can brute-force login, flood checkout, spam contact inquiries, or abuse coupon codes.

**Fix:** Implement rate limiting using:
- **Upstash Redis** (serverless-friendly) + a rate-limiting middleware wrapper.
- Or **Vercel Edge Middleware** with a simple in-memory counter for basic protection.
- Apply specifically to: `/api/checkout`, `/api/contact-inquiries`, all `/api/admin/*` routes, and login/signup endpoints.

---

## 3. Medium Vulnerabilities

### MEDIUM-01: Error Responses Expose Internal Details

**File:** `lib/firebase.ts` (`handleFirestoreError`)
**Current code:**
```ts
const errInfo: FirestoreErrorInfo = {
  error: error instanceof Error ? error.message : String(error),
  authInfo: {
    userId: auth.currentUser?.uid || null,
    email: auth.currentUser?.email || null,
    emailVerified: auth.currentUser?.emailVerified || null,
    // ...
  },
};
console.error('Firestore Error Details: ', JSON.stringify(errInfo));
throw new Error(JSON.stringify(errInfo));
```
**Impact:** Internal error details (user IDs, emails, auth state, Firestore paths) can leak to the client if the error propagates to an API response.

**Fix:**
- Log detailed errors server-side only.
- Return generic error messages to clients (e.g., "An unexpected error occurred").
- Never `throw new Error(JSON.stringify(errInfo))` — use a sanitized public message.

---

### MEDIUM-02: No Input Validation/Sanitization on API Routes

**Finding:** While `/api/checkout` has some validation (email regex, required fields), most API routes accept body payloads without schema validation or sanitization.

**Impact:** XSS via stored data (e.g., product names, review text, contact inquiry messages), NoSQL injection, and unexpected data shapes.

**Fix:**
- Use **Zod** schemas for all API request bodies.
- Sanitize all user-provided text with a library like `DOMPurify` (for HTML) or `sanitize-html`.
- Especially protect: contact inquiries, product reviews, user names, and any rich-text fields.

---

### MEDIUM-03: ESLint Ignored During Builds

**File:** `next.config.ts`
```ts
eslint: {
  ignoreDuringBuilds: true,
}
```
**Impact:** Build-time lint errors (which can catch security issues like `no-eval`, `no-reassign`, etc.) are suppressed.

**Fix:** Set `ignoreDuringBuilds: false` and fix all existing lint errors. Add `eslint-plugin-security` for additional security-focused rules.

---

### MEDIUM-04: No CORS Configuration

**Finding:** No CORS headers are configured. API routes use Next.js defaults.

**Impact:** In production, API routes may be callable from any origin. While Firebase Auth tokens provide some protection, defense in depth requires CORS restrictions.

**Fix:** Add CORS middleware that restricts API access to your own domain(s) only.

---

## 4. Low Vulnerabilities

### LOW-01: Firebase API Key Exposed in Client Bundle

**File:** `lib/firebase.ts` — imports `firebase-applet-config.json` which contains `apiKey`.

**Note:** This is **expected behavior** for Firebase web apps — the API key is not secret and is designed to be included in client code. Security comes from Firestore Rules and Firebase Auth, not from hiding the key.

**Action:** No fix needed, but ensure Firestore Rules are locked down (CRITICAL-01). Optionally restrict the API key in Google Cloud Console to your specific domains.

---

### LOW-02: No Session Expiry on localStorage User

**File:** `context/AuthContext.tsx`
**Finding:** `cr_local_user` in localStorage has no expiry. If a user's device is accessed, the session persists indefinitely.

**Fix:** Add a `expiresAt` timestamp to the localStorage object and validate it on app load. Or better: use Firebase session cookies (httpOnly) instead of localStorage.

---

### LOW-03: Development Log Files Committed

**Finding:** `dev-server.log`, `dev-server-error.log`, `firebase-debug.log` exist in the project directory.

**Impact:** These may contain sensitive debugging information (stack traces, environment values, user data).

**Fix:** Add `*.log` to `.gitignore` and remove existing log files from version control.

---

## 5. Security Headers Checklist

| Header | Status | Action |
|---|---|---|
| `X-Content-Type-Options` | Present | None needed |
| `X-Frame-Options` | Present (DENY) | None needed |
| `X-XSS-Protection` | Present | Consider removing (deprecated, CSP is better) |
| `Referrer-Policy` | Present | None needed |
| `Strict-Transport-Security` | Present | None needed |
| `Permissions-Policy` | Present | None needed |
| `Content-Security-Policy` | **MISSING** | Add immediately (see HIGH-03) |
| `Cross-Origin-Opener-Policy` | Missing | Add `same-origin` |
| `Cross-Origin-Resource-Policy` | Missing | Add `same-origin` |

---

## 6. Step-by-Step Implementation Guide

Follow this priority order. Each step is independent — implement them one at a time.

### Step 1: Lock Down Firestore Rules (CRITICAL-01)
- Replace `firestore.rules` with the production rules in [Section 7](#7-firebase-firestore-rules-production-ready).
- Deploy: `firebase deploy --only firestore:rules`
- **Time estimate:** 30 minutes

### Step 2: Remove Plaintext Password Storage (CRITICAL-02)
- In `context/AuthContext.tsx`, remove all `password` field writes to Firestore.
- Remove the Firestore fallback login/signup code entirely (lines 126-148, 199-228).
- Keep only Firebase Authentication (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`).
- **Time estimate:** 1 hour

### Step 3: Remove Admin Header Bypass (CRITICAL-03)
- In `lib/serverAuth.ts`, delete the `isMasterAdmin` header check block.
- In `lib/admin-api.ts`, delete the `x-admin-demo` header injection.
- **Time estimate:** 15 minutes

### Step 4: Add Next.js Middleware (CRITICAL-04)
- Create `middleware.ts` in project root (see [Section 8](#8-nextjs-middleware)).
- Protect `/admin/*` and `/api/admin/*` routes.
- **Time estimate:** 1 hour

### Step 5: Remove Offline/Fake Login (CRITICAL-05)
- Delete `loginOffline` from `AuthContext.tsx`.
- Remove the Google OAuth `window.prompt` fallback.
- Remove all references to `loginOffline` in components.
- **Time estimate:** 30 minutes

### Step 6: Add CSP Header (HIGH-03)
- Add `Content-Security-Policy` to `next.config.ts` headers array.
- Add `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`.
- **Time estimate:** 30 minutes

### Step 7: Add Input Validation (MEDIUM-02)
- Install Zod: `npm install zod`
- Create validation schemas for all API routes.
- Add sanitization for user-generated text content.
- **Time estimate:** 2-3 hours

### Step 8: Add Rate Limiting (HIGH-04)
- Install Upstash Redis client.
- Create a `rateLimit` middleware wrapper.
- Apply to checkout, contact, auth, and admin routes.
- **Time estimate:** 2 hours

### Step 9: Sanitize Error Messages (MEDIUM-01)
- Update `handleFirestoreError` to return generic messages to clients.
- Keep detailed logging server-side only.
- **Time estimate:** 30 minutes

### Step 10: Enable ESLint in Builds (MEDIUM-03)
- Set `ignoreDuringBuilds: false` in `next.config.ts`.
- Fix all existing lint errors.
- **Time estimate:** 1-2 hours

---

## 7. Firebase Firestore Rules (Production-Ready)

Replace the entire `firestore.rules` file with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    // Check if user is signed in (not anonymous)
    function isSignedIn() {
      return request.auth != null;
    }

    // Check if user's email is verified
    function isEmailVerified() {
      return isSignedIn() && request.auth.token.email_verified == true;
    }

    // Check if user is the primary admin (by email)
    function isPrimaryAdmin() {
      return isSignedIn() && request.auth.token.email == 'who1sdanish011@gmail.com';
    }

    // Check if user has an admin document
    function isAdmin() {
      return isPrimaryAdmin() || (
        isSignedIn() &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid))
      );
    }

    // Validate email format
    function isValidEmail(email) {
      return email is string && email.matches('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
    }

    // ============================================================
    // USERS COLLECTION
    // ============================================================
    match /users/{userId} {
      // Users can read their own profile
      allow read: if isSignedIn() && request.auth.uid == userId;

      // Users can create/update only their own profile
      // No password field allowed, email must match auth token
      allow create: if isSignedIn() && request.auth.uid == userId
        && request.resource.data.email == request.auth.token.email
        && !request.resource.data.keys().hasAny(['password', 'isAdmin', 'role', 'admin']);

      allow update: if isSignedIn() && request.auth.uid == userId
        && request.resource.data.email == resource.data.email
        && !request.resource.data.keys().hasAny(['password', 'isAdmin', 'role', 'admin']);

      // No one can delete user profiles (use Firebase Admin SDK)
      allow delete: if false;

      // No listing of users
      allow list: if false;
    }

    // ============================================================
    // ADMINS COLLECTION
    // ============================================================
    match /admins/{adminId} {
      allow read: if isSignedIn() && (request.auth.uid == adminId || isAdmin());
      allow write: if isPrimaryAdmin();
      allow list: if isPrimaryAdmin();
    }

    // ============================================================
    // ORDERS COLLECTION
    // ============================================================
    match /orders/{orderId} {
      // Authenticated users can read their own orders
      // Guest users can read a single order by ID (for tracking)
      allow get: if true; // Allow order tracking by public tracking ID

      // Only owner can list their orders
      allow list: if isSignedIn() && request.auth.uid == resource.data.ownerId;

      // Anyone (guest or authed) can create orders
      // But authed users must use their own uid as ownerId
      allow create: if request.resource.data.ownerId == null ||
                        (isSignedIn() && request.resource.data.ownerId == request.auth.uid);

      // Orders are immutable after creation — no updates or deletes
      allow update: if isAdmin();
      allow delete: if false;
    }

    // ============================================================
    // ORDER TRACKING EVENTS
    // ============================================================
    match /order-tracking-events/{eventId} {
      allow read: if true; // Public tracking
      allow create: if false; // Only via server/Admin SDK
      allow update, delete: if isAdmin();
    }

    // ============================================================
    // PRODUCTS (Public read, admin write)
    // ============================================================
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /product-variants/{variantId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // CATEGORIES, COLLECTIONS, COLORS (Public read, admin write)
    // ============================================================
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /collections/{collectionId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /colors/{colorId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // PROMOTIONS (Public read active, admin write)
    // ============================================================
    match /promotions/{promoId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /promotion-redemptions/{redemptionId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create: if true; // Created during checkout
      allow update, delete: if isAdmin();
    }

    match /promotion-user-usage/{usageId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create, update: if true; // Managed during checkout
      allow delete: if isAdmin();
    }

    // ============================================================
    // REVIEWS (Public read, authed create, admin moderate)
    // ============================================================
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
    }

    // ============================================================
    // CONTACT INQUIRIES (Public create, admin read)
    // ============================================================
    match /contact-inquiries/{inquiryId} {
      allow create: if true; // Public can submit
      allow read, update, delete: if isAdmin();
    }

    // ============================================================
    // INVENTORY TRANSACTIONS (Admin only)
    // ============================================================
    match /inventory-transactions/{txId} {
      allow read: if isAdmin();
      allow create: if false; // Via server only
      allow update, delete: if false;
    }

    // ============================================================
    // STOREFRONT / PAGE SETTINGS (Public read, admin write)
    // ============================================================
    match /storefront-settings/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /shop-page-settings/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /about-page/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /contact-page/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /faq/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // AUDIENCE GROUPS & CAMPAIGN CARDS (Admin only)
    // ============================================================
    match /audience-groups/{groupId} {
      allow read, write: if isAdmin();
    }

    match /campaign-cards/{cardId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // NOTIFICATIONS QUEUE (Admin only)
    // ============================================================
    match /notifications/{docId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.recipient == request.auth.token.email);
      allow write: if isAdmin();
    }

    // ============================================================
    // CART DATA (User-scoped)
    // ============================================================
    match /carts/{cartId} {
      allow read, write: if isSignedIn() && request.auth.uid == cartId;
    }

    // ============================================================
    // DENY EVERYTHING ELSE BY DEFAULT
    // ============================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 8. Next.js Middleware

Create a new file `middleware.ts` in the project root (same level as `next.config.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin pages (but allow login page)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect admin API routes (defense in depth)
  if (pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Block the known bypass headers
    if (
      request.headers.get('x-admin-demo') === '1' ||
      request.headers.get('x-admin-master') === '1'
    ) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

---

## 9. Input Validation & Sanitization

### Install Zod

```bash
npm install zod
```

### Example: Checkout Validation Schema

Create `lib/validations/checkout.ts`:

```typescript
import { z } from 'zod';

export const checkoutSchema = z.object({
  shippingInfo: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Valid email required'),
    address: z.string().min(1, 'Address is required').max(500),
    phone: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  shipCost: z.number().min(0).optional(),
  payMethod: z.string().min(1),
  items: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    variantId: z.string().min(1),
    qty: z.number().int().positive().max(99),
    name: z.string(),
    size: z.string().optional(),
    color: z.string().optional(),
    img: z.string().optional(),
  })).min(1, 'Cart cannot be empty'),
  ownerId: z.string().nullable().optional(),
  promoCodeApplied: z.string().nullable().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

### Usage in API Route

```typescript
import { checkoutSchema } from '../../../lib/validations/checkout';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = checkoutSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const validated = result.data;
  // ... continue with validated data
}
```

### Text Sanitization for Stored Content

For user-generated content (reviews, contact messages, names):

```typescript
function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '')        // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove JS protocol
    .replace(/on\w+=/gi, '')      // Remove event handlers
    .trim()
    .slice(0, 5000);             // Max length
}
```

---

## 10. Rate Limiting

### Install Upstash Redis

```bash
npm install @upstash/redis @upstash/ratelimit
```

### Create Rate Limiter

Create `lib/rate-limit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// General rate limiter: 10 requests per 10 seconds
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Checkout rate limiter: 3 orders per minute
export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 m'),
});

// Auth rate limiter: 5 attempts per minute
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
});
```

### Usage in API Route

```typescript
import { checkoutLimiter } from '../../../lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success } = await checkoutLimiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // ... continue
}
```

---

## 11. Post-Fix Testing Checklist

After implementing all fixes, verify each item:

- [ ] Firestore rules deployed — try reading `/users` collection from client, should be denied
- [ ] No `password` field in any Firestore user document
- [ ] Firestore fallback login removed — login only works via Firebase Auth
- [ ] `x-admin-demo: 1` header no longer grants admin access
- [ ] `loginOffline` function removed — no fake sessions possible
- [ ] Google OAuth fallback via `window.prompt` removed
- [ ] `/admin` redirects to `/admin/login` when not authenticated
- [ ] `/api/admin/*` returns 401 without a valid Bearer token
- [ ] CSP header present in browser DevTools > Network > Response Headers
- [ ] Rate limiting returns 429 after exceeding limits
- [ ] Error responses to client do not contain user IDs, emails, or internal paths
- [ ] ESLint runs during builds (`ignoreDuringBuilds: false`)
- [ ] All API routes validate input with Zod schemas
- [ ] User-generated text is sanitized before storing in Firestore
- [ ] Log files (`*.log`) added to `.gitignore`
- [ ] Firebase API key restricted to your domains in Google Cloud Console

---

## Summary: Priority Fix Order

| Priority | Issue | Effort | Risk if Unfixed |
|---|---|---|---|
| 1 | Firestore rules open (CRITICAL-01) | 30 min | Total data breach |
| 2 | Plaintext passwords (CRITICAL-02) | 1 hr | Credential exposure |
| 3 | Admin header bypass (CRITICAL-03) | 15 min | Full admin takeover |
| 4 | No middleware (CRITICAL-04) | 1 hr | Unprotected admin routes |
| 5 | Fake login (CRITICAL-05) | 30 min | Auth bypass |
| 6 | Admin demo header in dev (HIGH-01) | 10 min | Admin access on staging |
| 7 | Plaintext password fallback (HIGH-02) | 30 min | Auth bypass |
| 8 | No CSP (HIGH-03) | 30 min | XSS vulnerability |
| 9 | No rate limiting (HIGH-04) | 2 hr | Abuse/brute force |
| 10 | Input validation (MEDIUM-02) | 3 hr | XSS/injection |
| 11 | Error exposure (MEDIUM-01) | 30 min | Info leakage |
| 12 | ESLint disabled (MEDIUM-03) | 1-2 hr | Missed vulnerabilities |
| 13 | CORS (MEDIUM-04) | 30 min | Cross-origin abuse |

**Total estimated effort:** 10-14 hours for a fully hardened production-ready application.

---

*This document should be updated as fixes are implemented and new vulnerabilities are discovered.*
