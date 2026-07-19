# Security Specification: Firestore Access Rules

## 1. Data Invariants
1. **User Ownership**: A user profile document under `/users/{userId}` can only be read, created, or updated by the authenticated user whose `request.auth.uid` matches `{userId}`.
2. **Immutable Emails**: A user's email address cannot be changed after creation.
3. **Admin Exclusivity**: Admin Concept does not exist in this simple retail app, so all operations rely on strict ownership or explicit order mapping.
4. **Order Authorization**:
   - Authenticated users can read their own orders if the order's `ownerId` matches their `uid`.
   - Guest/anonymous users (or anyone with a valid matching order ID) can lookup their order for tracking if they provide the exact order ID, but only for reading (`get` operation only, not listing/querying), preventing bulk data scanning.
   - Creating an order is allowed for anyone (`isSignedIn()` or guest), but if a user is logged in, their `ownerId` must strictly match their authentic `uid`.
   - Once an order is placed, it cannot be edited or deleted (`update` and `delete` are denied) by customers to preserve transactional integrity.

---

## 2. The "Dirty Dozen" Payloads (Malicious Attacks)

### Attack 1: Identity Hijacking (Create user profile for someone else)
- **Path**: `/users/attacker_uid` (where `request.auth.uid` is `victim_uid`)
- **Payload**:
  ```json
  {
    "name": "Attacker",
    "email": "attacker@example.com"
  }
  ```
- **Expectation**: `PERMISSION_DENIED`

### Attack 2: Identity Spoofing (Write a user profile with different email than authenticated email)
- **Path**: `/users/victim_uid`
- **Payload**:
  ```json
  {
    "name": "Victim Spoof",
    "email": "malicious@example.com"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (if mismatch with `request.auth.token.email`)

### Attack 3: Profile Overwrite / Poisoning (Excessively large payload values)
- **Path**: `/users/victim_uid`
- **Payload**:
  ```json
  {
    "name": "Very long name... (10KB of junk content)",
    "email": "victim@example.com"
  }
  ```
- **Expectation**: `PERMISSION_DENIED`

### Attack 4: Order Tampering (Create an order claiming someone else's ownerId)
- **Path**: `/orders/CR-123456`
- **Payload**:
  ```json
  {
    "orderId": "CR-123456",
    "ownerId": "victim_uid",
    "statusIndex": 0,
    "delivery": "Mon, Jul 20",
    "total": 50.00,
    "payMethod": "COD",
    "items": [],
    "customer": {}
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (due to ownerId mismatch)

### Attack 5: Order State Modification (Attempting to modify status of an order after placement)
- **Path**: `/orders/CR-123456`
- **Payload**:
  ```json
  {
    "statusIndex": 4
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (orders are immutable once placed)

### Attack 6: Unauthenticated Profile List / Scraping (List other users' profiles)
- **Path**: `/users` (list query)
- **Expectation**: `PERMISSION_DENIED` (no blanket reads/listing allowed)

### Attack 7: Unauthenticated Order List Scraping (Querying orders without ownerId restriction)
- **Path**: `/orders` (list query where ownerId is not restricted)
- **Expectation**: `PERMISSION_DENIED`

### Attack 8: Missing Required Fields on Order Create
- **Path**: `/orders/CR-123456`
- **Payload**:
  ```json
  {
    "orderId": "CR-123456",
    "total": 50.00
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (must have all required fields)

### Attack 9: Malicious ID Injection (ID Poisoning Guard)
- **Path**: `/orders/CR-CR-CR-CR-CR-CR-JUNK-DATA-OVERFLOW-ATTACK-1234567890`
- **Expectation**: `PERMISSION_DENIED` (IDs must match exact patterns)

### Attack 10: Injecting Shadow fields in user profile
- **Path**: `/users/user_123`
- **Payload**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "isAdmin": true
  }
  ```
- **Expectation**: `PERMISSION_DENIED`

### Attack 11: Deleting existing order (Destructive write)
- **Path**: `/orders/CR-123456`
- **Expectation**: `PERMISSION_DENIED`

### Attack 12: Creating an order with future timestamp from future client time
- **Path**: `/orders/CR-123456`
- **Payload**:
  ```json
  {
    "orderId": "CR-123456",
    "statusIndex": 0,
    "delivery": "Mon, Jul 20",
    "total": 50.00,
    "payMethod": "COD",
    "items": [],
    "customer": {},
    "createdAt": "2050-01-01T00:00:00Z"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (must use valid timestamps/structures or server dates)

---

## 3. Test Runner Definition (`firestore.rules.test.ts`)
We specify that unit tests must ensure that all these vulnerabilities are rejected by our robust Firestore Security Rules.
