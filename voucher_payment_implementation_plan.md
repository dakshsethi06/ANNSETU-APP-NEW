# Voucher Payment System — Implementation Plan
### AnnsetuNewApp | Backend (Node.js/Express + pg) + Mobile (React Native / Expo)

> **Ground Rule:** This document is a planning reference only. No code has been modified.
> Each step below describes **what** to build, **why** it is needed, and **where** in the existing codebase it fits.

---

## Current Foundation Assessment

Before starting work, it is important to acknowledge what the codebase already handles correctly so that we don't rebuild things unnecessarily.

| Capability | Tool in AnnsetuNewApp | Status |
|---|---|---|
| Financial data storage | PostgreSQL (`pg`) | ✅ Ready |
| UI state during checkout | Zustand | ✅ Ready |
| Online payment processing | `razorpay` (backend) + `react-native-razorpay` (mobile) | ✅ Ready |
| Input validation at Express routes | — | ❌ Missing |
| Atomic DB transactions for ledger writes | Partially exists (only in payment.create.controller.js) | ⚠️ Inconsistent |
| Network retry / idempotency protection | — | ❌ Missing |
| Async webhook → mobile notification bridge | — | ❌ Missing |

---

## Step 1 — Define the Voucher Database Schema

**Priority:** Highest. Every other step depends on this table existing.

### What to build
A new PostgreSQL table (or set of tables) to store voucher records. The table must track the voucher's current lifecycle state:
- A unique voucher code (e.g., `ANNSETU-SAVE50`)
- The type of voucher: flat discount, percentage discount, or full credit note
- Applicable constraints: minimum order amount, maximum usage count, expiry date, which farmers or cold storage IDs it is valid for
- A running count of how many times it has been used
- A status field: `ACTIVE`, `EXHAUSTED`, `EXPIRED`, `CANCELLED`

### Why this is needed
Without a dedicated table, the voucher state exists only in memory. If the server restarts between a user applying a code and completing payment, the voucher record is lost, leading to inconsistent application of discounts.

### Where it fits
A new migration SQL file needs to be added to `backend/`. The `pg` driver is already configured and connected in `backend/config/database.js`, so a plain SQL `CREATE TABLE` script is sufficient. No ORM is needed.

---

## Step 2 — Add Payload Validation via Zod (Backend)

**Priority:** High. This is the security gatekeeper for the entire module.

### What to build
Install the `zod` library as a dependency in the backend. Create a dedicated validation middleware file at `backend/modules/voucher/voucher.validator.js`.

Define strict Zod schemas for every incoming request that touches voucher logic:
- `applyVoucherSchema`: Must enforce that `voucherCode` is a non-empty string with a defined max length, `orderId` is a valid UUID format, and `userId` / `farmerId` are present and valid.
- `redeemVoucherSchema`: A stricter schema used at the point of final payment confirmation that cross-validates amount vs. voucher discount type.

This validator should be wired in as an Express middleware function, sitting in front of the route controller — exactly the same pattern used in `payment.routes.js` with `validateCreateOrder`.

### Why this is needed
The existing backend uses raw Express requests with no schema enforcement. If a mobile client sends an empty string as a voucher code or a `NaN` as the amount, the raw `pg` query will either throw a cryptic database error or — more dangerously — insert null/garbage data into the ledger. Zod stops this at the door, before a single SQL query is executed.

### Where it fits
- **Install:** Add `zod` to `backend/package.json` dependencies.
- **New file:** `backend/modules/voucher/voucher.validator.js`
- **Wire into:** `backend/modules/voucher/voucher.routes.js` (new file, modelled after `payment.routes.js`)

---

## Step 3 — Build the Voucher Service Layer with Explicit SQL Transactions

**Priority:** Critical. This is the core financial safety mechanism.

### What to build
A `voucher.service.js` file inside `backend/modules/voucher/` that contains the business logic for two primary operations:

**A. Apply Voucher (Validate & Preview Discount)**
- Queries the voucher table to check: Does this code exist? Is it `ACTIVE`? Has it expired? Has the usage count been exceeded? Does this farmer/order meet the minimum amount threshold?
- Returns a preview payload to the mobile app (e.g., "This code gives you ₹500 off your ₹3,200 balance. You will pay ₹2,700 online.")
- Does **not** modify any DB records yet.

**B. Redeem Voucher (Final Commit — must be transactional)**
This is where the `BEGIN / COMMIT / ROLLBACK` block is non-negotiable. The exact sequence inside the transaction must be:
1. `SELECT ... FOR UPDATE` on the voucher row — this locks the row so no concurrent request can use the same code simultaneously.
2. Re-validate the voucher status (it may have been exhausted between the "apply" and "redeem" step).
3. Increment the `usageCount` and update status to `EXHAUSTED` if the max usage is reached.
4. Deduct the voucher discount from the order's outstanding amount.
5. Insert a row into the voucher ledger/audit log table (recording: `farmerId`, `voucherCode`, `discountApplied`, `timestamp`, `orderId`).
6. `COMMIT`.

If any of steps 1–5 throw an error, the catch block must execute `ROLLBACK` immediately, and then release the database client back to the pool.

### Why this is needed
A voucher redemption is an all-or-nothing financial operation. If the server crashes, times out, or throws an error between step 3 and step 5, the voucher usage count gets incremented but the discount is never recorded — meaning money is lost from the ledger. The PostgreSQL transaction block guarantees that either everything succeeds together, or nothing changes at all.

### Where it fits
- **New file:** `backend/modules/voucher/voucher.service.js`
- **Uses:** The existing `pg` pool from `backend/config/database.js`

---

## Step 4 — Implement an Idempotency Key Tracking Table

**Priority:** High. Critical for mobile network resilience.

### What to build
A new lightweight PostgreSQL table, e.g. `IdempotencyRecord`, with columns:
- `key` (unique string — a UUID generated by the mobile app)
- `response` (JSONB — the exact API response the server sent back)
- `createdAt` (timestamp — for auto-expiry cleanup)

On the backend, a middleware function checks every incoming `POST /api/vouchers/redeem` request for an `Idempotency-Key` header:
- If the key **does not exist** in the table: proceed normally, execute the SQL transaction, then store the result in the table.
- If the key **already exists**: immediately return the stored response without re-executing any SQL.

On the mobile side, the React Native app must generate a `uuid` at the moment the checkout session begins (not at the moment of button press) and attach it to the request header.

### Why this is needed
Mobile networks are unreliable. The most dangerous scenario is:
1. User presses "Apply & Pay with Voucher".
2. The backend successfully runs the SQL transaction and commits — voucher is deducted, ledger is written.
3. The mobile app's internet drops for 3 seconds before it receives the HTTP response.
4. The app shows an error to the user, who taps the button again.
5. Without idempotency protection, the second tap triggers a second SQL transaction — double-spending the voucher.

The idempotency key makes the second identical request return the already-computed success response safely.

### Where it fits
- **New SQL table:** `IdempotencyRecord` (migration file in `backend/`)
- **New middleware:** `backend/shared/middleware/idempotency.middleware.js`
- **Mobile:** A utility hook in `mobile/src/core/` that generates and persists the UUID per checkout session using `AsyncStorage`

---

## Step 5 — Add Push Notifications via expo-server-sdk

**Priority:** Medium. Required for webhook-driven async confirmation flow.

### What to build
Install `expo-server-sdk` on the Node.js backend. Create a `notifications.service.js` file in `backend/shared/services/`.

The notification service should expose a single function: `sendPushNotification(expoPushToken, title, body, data)`.

This function gets called from inside the `payment.webhook.controller.js` — specifically, when Razorpay fires a `payment.captured` or `payment.failed` webhook event. At that point, the server looks up the farmer's stored Expo push token from the database and pings the mobile device directly.

On the mobile side, the Expo push token is already partially handled via `expo-notifications` (already in the mobile `package.json`). This token needs to be stored in the PostgreSQL farmer profile row when the farmer first logs in.

### Why this is needed
The Razorpay payment webhook is asynchronous. When a user pays via UPI or Card and the cold storage internet is slow, the final payment confirmation can arrive at the Express server 10–30 seconds after the user has already left the checkout screen. Without a push notification bridge, the mobile app has no way of knowing the payment was finalized unless the user manually refreshes. This is a poor user experience and a trust issue in a financial app.

### Where it fits
- **Install:** Add `expo-server-sdk` to `backend/package.json`
- **New file:** `backend/shared/services/notifications.service.js`
- **Modify:** `backend/modules/payment/payment.webhook.controller.js` — add the notification call after the successful payment is committed to the DB
- **Modify:** Mobile farmer profile/session logic — save and sync the `expoPushToken` to the backend on login

---

## Execution Order Summary

The steps above must be executed in this exact order because each depends on the one before it:

```
Step 1: DB Schema (Voucher tables)
    ↓
Step 2: Zod Validators (protect routes)
    ↓
Step 3: SQL Transaction Service (core ledger logic)
    ↓
Step 4: Idempotency Middleware (wrap the service)
    ↓
Step 5: Push Notifications (async confirmation)
```

---

## Files to Create (New)

| File | Purpose |
|---|---|
| `backend/modules/voucher/voucher.routes.js` | Express router for all voucher endpoints |
| `backend/modules/voucher/voucher.validator.js` | Zod schema middleware |
| `backend/modules/voucher/voucher.controller.js` | Express request/response handlers |
| `backend/modules/voucher/voucher.service.js` | Core business logic + SQL transactions |
| `backend/modules/voucher/voucher.repository.js` | Raw SQL queries (SELECT, INSERT, UPDATE) |
| `backend/shared/middleware/idempotency.middleware.js` | Idempotency key check |
| `backend/shared/services/notifications.service.js` | Expo push notification sender |
| `mobile/src/features/farmer/hooks/useVoucher.js` | Mobile hook for voucher state + API calls |

## Files to Modify (Existing)

| File | Change |
|---|---|
| `backend/server.js` | Mount the new voucher router |
| `backend/modules/payment/payment.webhook.controller.js` | Add push notification call on payment capture |
| `mobile/src/features/farmer/screens/KhataTab.js` | Add voucher entry UI |
