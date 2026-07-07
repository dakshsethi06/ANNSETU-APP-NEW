# Consolidated Architectural Review & Action Plan

This document consolidates findings from `architectural_review.md`, `supplementary_review.md`, and `third_pass_review.md`. It outlines the required changes and divides them among four developer roles to enable concurrent work.

---

## Part 1: Comprehensive List of Findings & Changes

### 1. Critical Security Vulnerabilities & Auth Bypasses
1. **Mocked OTP Verification**: `OtpScreen.js` catches Supabase OTP verification errors and unconditionally calls `setVerified(true)`. Any 6-digit code logs into any account.
   * **Change**: Validate OTP verification correctly and block transition if verification fails.
2. **Hardcoded MPIN Reset OTP**: The `resetMpin` route checks if `otp === '1234'`. Anyone knowing a farmer's phone number can reset their PIN.
   * **Change**: Integrate proper OTP verification via Supabase or a third-party SMS service.
3. **Hardcoded API Keys and Secrets**: Secrets (Supabase anon key, Weather API key, data.gov.in key, Razorpay keys) are committed to git and bundled in the mobile app client.
   * **Change**: Migrate all secrets to environment variables. Do not expose private keys on the client.
4. **Razorpay Webhook Verification Bypass**: If `RAZORPAY_WEBHOOK_SECRET` is unset, the code falls back to a hardcoded signature check bypass. An attacker can POST spoofed payment confirmations.
   * **Change**: Enforce strict webhook signature checks. Fail if the secret is missing.
5. **Insecure PostgreSQL SSL**: `rejectUnauthorized: false` allows any SSL certificate, exposing the database link to Man-in-the-Middle (MitM) attacks.
   * **Change**: Configure proper SSL certificate verification for production databases.
6. **Unrestricted CORS**: Express backend uses open `cors()` middleware with no origin filters.
   * **Change**: Implement CORS whitelist restricting requests to production domains and development hosts.
7. **No API Authentication/Authorization**: Protected endpoints (fetching ledger, dispatch, holdings) require no JWT authentication or role check.
   * **Change**: Issue JWTs on login, implement an authentication middleware, and apply role-based access control (RBAC).

### 2. Architectural & Structural Debt
8. **Conditional Rendering Navigation**: Mobile app uses `switch(role)` for root screens and `activeTab === 'name'` for inner screens. Android back button exits the app; tabs unmount and lose state.
   * **Change**: Replace with React Navigation using Stack, BottomTab, and Nested navigators.
9. **God-Object Root Component**: `App.js` handles Supabase session, roles, keyboard, font loading, OTA checks, push tokens, and passes 9 props.
   * **Change**: Manage global state (auth, settings) using Zustand.
10. **Role Naming Inversion**: The role `'ColdStorage'` is used to designate a Farmer dashboard, while `'ColdStorageFacility'` represents the actual storage facility.
    * **Change**: Establish clear role constants (`FARMER`, `VENDOR`, `COLD_STORAGE_FACILITY`) via an enum or constants file.
11. **Circular Core/Feature Dependencies**: `core/network/api.js` acts as a barrel file re-exporting feature service methods, which then import from the core API module.
    * **Change**: Enforce clean dependency inversion. Features should own their API clients and routes; core must not import from features.
12. **Flat Route Namespaces**: All modules mount directly under `/api`, causing route collision risks and preventing scoped middleware.
    * **Change**: Scope routes dynamically by module under `/api/v1/...`.
13. **Lack of Global Error Handling**: Express app has no centralized error-handling middleware. Unhandled promise rejections can crash the process.
    * **Change**: Add 4-parameter Express error middleware and register uncaught exception event handlers.
14. **DRY Hashing Violation**: MPIN hashing/verification is copy-pasted across multiple controllers.
    * **Change**: Extract functions to a shared helper utility.

### 3. Database Integrity & Transaction Failures
15. **Non-Transactional Financial Updates**: `approvePayment` updates payment status and loops over outstanding bills to deduct balances without using database transactions.
    * **Change**: Wrap multi-step financial writes in `BEGIN`, `COMMIT`, and `ROLLBACK` blocks.
16. **Dangerous Dispatch Fallback**: If a farmer has no active lot during dispatch, the code falls back to assigning the first database row of the `AmadLot` table, regardless of owner.
    * **Change**: Return a 400 Bad Request error if no matching lot is found. Never assign arbitrary lots.
17. **Payment Receipt URL in Note Field**: Payment receipts path is stored in the `note` column instead of a dedicated field.
    * **Change**: Add a dedicated `receiptUrl` column to the `Payment` schema.
18. **Shadow Users and plaintext passwords**: System automatically inserts dummy user records with plaintext password hash `'dummy_hash'` for notifications.
    * **Change**: Unify user profiles under a single table structure linked to Supabase authentication.

### 4. Performance, Scaling & API Issues
19. **Excessive Notification Polling**: Mobile client polls `/notifications` every 5 seconds, query-hammering the PostgreSQL instance.
    * **Change**: Implement real-time notifications via Supabase Realtime socket events.
20. **GET Endpoint Side Effects**: `/api/notifications` triggers database writes (deletes stale items) inside a query request.
    * **Change**: Make the GET request safe. Move cleanup tasks to a background Cron job or separate route.
21. **No Mandi API Caching**: External government API is queried for 1,000 rows on every single request.
    * **Change**: Store mandi prices in an in-memory/Redis TTL cache (hourly refresh) and implement pagination.
22. **Unbounded Connection Pool**: Database connection pool doesn't configure maximum clients or connection timeouts.
    * **Change**: Set appropriate limits (`max: 20`, connection timeouts) on the Postgres Pool configuration.
23. **Global Payload Size Abuse Limit**: Backend applies a 15MB limit globally, creating a heap allocation DoS vector.
    * **Change**: Set global JSON body limit to `100kb`. Use scoped middleware with `multer` for multipart receipt uploads.
24. **Awaiting External Services on Request Thread**: Creating notifications awaits external SMTP/SMS network calls, stalling request resolution.
    * **Change**: Offload SMS/email sending to an asynchronous worker queue (e.g. BullMQ) or non-blocking event loops.
25. **Holdings Table Scan**: `getHoldings` returns the entire database holdings table to let the client filter records.
    * **Change**: Add `farmerId` and `coldStorageId` filter options directly to the SQL queries on the backend.

### 5. UI/UX Bugs & Frontend Stubs
26. **Fake Vendor Dashboard**: Vendor dashboard metrics and lists are entirely hardcoded values.
    * **Change**: Integrate real database metrics, Sauda statuses, and inbound activities into the vendor views.
27. **Duplicate Age Column**: `StockTab.js` renders two columns labeled "Age" showing duplicate metrics.
    * **Change**: Replace the redundant column with "Variety" or "Room Location".
28. **Profile Tab Stubs**: Menu buttons in `ProfileTab.js` do not have `onPress` hooks, and the KYC badge is hardcoded.
    * **Change**: Add navigation/modals to menu options and dynamically verify KYC status from database.
29. **Mandi Dropdown Limit**: City dropdown only populates for 10 selected states.
    * **Change**: Incorporate complete geographic data or fetch markets dynamically from API.
30. **Mock Checkout Script Injection**: The mock payment page interpolates the raw `orderId` into template strings containing inline scripts.
    * **Change**: Validate/sanitize inputs and contextually escape parameters before rendering WebView HTML.
31. **ColdStorage Ledgers Dev Stub**: App requests ledger data for `'default_farmer'` on every mount.
    * **Change**: Remove the developmental stub lookup.
32. **Hardcoded State in Register Screen**: Disticts dropdown includes ~500 lines of static code.
    * **Change**: Move list to a static `districts.json` config file.
33. **Lack of Test Automation**: Zero unit/integration tests exist in the project.
    * **Change**: Configure Jest testing suite and write assertions for calculations.

---

## Part 2: Task Division for 4 Developers

```mermaid
gantt
    title Parallel Development Strategy
    dateFormat  YYYY-MM-DD
    section Dev 1: Security
    OTP & Authentication Securing :active, 2026-07-08, 5d
    Secrets Migration & SSL/CORS  :after, 5d
    section Dev 2: Performance
    Supabase Realtime Notifications:active, 2026-07-08, 6d
    Caching, Connection Pools & Limits :after, 4d
    section Dev 3: Mobile UI
    React Navigation & Zustand Integration:active, 2026-07-08, 7d
    UI Cleanups & JSON Migrations :after, 3d
    section Dev 4: Business logic
    Transactions & Database Restructure:active, 2026-07-08, 6d
    Vendor Screen APIs & Unit Testing :after, 4d
```

### Developer 1: Security, Authentication & Secrets Hardening
> **Focus**: Secure the login flows, remove authentication bypass channels, hide API secrets, and apply endpoint protection.

* **Task 1.1: Secure OTP login verification flow**
  * Modify `OtpScreen.js` to abort login when Supabase OTP verification throws an error.
* **Task 1.2: Remove hardcoded MPIN Reset OTP**
  * Update the MPIN reset process to require SMS OTP validation (via Supabase or Twilio) instead of checking against `'1234'`.
* **Task 1.3: Eliminate hardcoded API secrets from code**
  * Move the Weather API key, government Mandi API key, and Supabase anon key out of the mobile client configuration. Proxy third-party services through the backend.
* **Task 1.4: Fix Razorpay signature bypass**
  * Remove `skipVerify` fallback variables from `payment.controller.js` to ensure the signature is always verified using Webhook secrets.
* **Task 1.5: Secure database connection and CORS**
  * Remove `rejectUnauthorized: false` from database settings.
  * Restrict backend `cors()` to specify origin whitelists rather than allowing any host.
* **Task 1.6: Implement JWT endpoint protection**
  * Write a token verification middleware (JWT) on the Express backend, issue tokens on login, and lock down farmer/vendor/cold-storage endpoints.

---

### Developer 2: Backend Architecture & Performance Optimization
> **Focus**: Improve API routing structure, implement backend caching, optimize database queries, and manage background tasks.

* **Task 2.1: Reorganize backend API routing**
  * Restructure route definitions under `/api/v1/` namespaces (e.g. `/api/v1/farmers`, `/api/v1/storage`) to avoid namespaces collision.
* **Task 2.2: Centralize Express error handling**
  * Add standard global error middleware in `server.js` to catch async routing errors and prevent unhandled process crashes.
* **Task 2.3: Configure Postgres pool limits**
  * Define explicit options (`max`, `idleTimeoutMillis`, `connectionTimeoutMillis`) for the PostgreSQL pool config.
* **Task 2.4: Replace notification polling with Supabase Realtime**
  * Replace the 5-second interval poll in `HomeScreen.js` with a Supabase realtime client subscription.
* **Task 2.5: Remove database write queries from HTTP GET endpoints**
  * Modify the `getNotifications` endpoint to remove `DELETE` executions. Create a separate database cleaning routine or cron script.
* **Task 2.6: Implement caching on Mandi commodity prices**
  * Configure an in-memory or Redis-based cache with a 1-hour TTL on the Mandi government API proxy service.
* **Task 2.7: Optimize holdings retrieval query**
  * Add filtering (`WHERE` clauses for `farmerId` and `coldStorageId`) to `getHoldings` to avoid client-side filters on full table scans.
* **Task 2.8: Set JSON size safety boundaries**
  * Reduce global JSON body limits to `100kb`. Apply scoped limits and write streamed files via `multer` for image/receipt uploads.
* **Task 2.9: Make outbound communication non-blocking**
  * Push SMS and Email notifications to a job queue (e.g. BullMQ) or process them in `setImmediate` instead of blocking the request thread.

---

### Developer 3: Mobile Architecture & Navigation
> **Focus**: Implement structured navigation, extract global state, clean up UI stubs, and isolate core services.

* **Task 3.1: Integrate React Navigation stack**
  * Replace role-based conditional rendering in `AppNavigator.js` and `HomeScreen.js` with structured Stack and BottomTab navigators from `@react-navigation/native`.
* **Task 3.2: Implement Zustand state store**
  * Move auth session, loading states, and user roles from local `App.js` hooks into a consolidated global store. Clean up prop drilling.
* **Task 3.3: Refactor role naming schema**
  * Rename the `'ColdStorage'` role reference to `'FARMER'` (or similar) across the frontend codebase to clarify intent.
* **Task 3.4: Resolve circular network dependencies**
  * Isolate feature APIs and eliminate the core-depends-on-features barrel exports in `core/network/api.js`.
* **Task 3.5: Extract district configuration list**
  * Move the ~500 line `DISTRICTS_BY_STATE` array out of `RegisterScreen.js` into a static `districts.json` asset.
* **Task 3.6: Correct StockTab columns**
  * Remove the duplicate "Age" column rendering in `StockTab.js` and show the commodity variety or storage room location.
* **Task 3.7: Implement profile tab functions**
  * Connect profile buttons to navigators or mock screens. Query and display actual user KYC state instead of showing "KYC Verified" unconditionally.
* **Task 3.8: Complete Mandi city lists**
  * Correct the Mandi dropdown list to support all selection states. Clean up empty async wrapper scopes.
* **Task 3.9: Remove default_farmer queries**
  * Delete the developmental ledger loading stubs on `ColdStorageScreen` mount.

---

### Developer 4: Business Logic, Payment Reconciliation & QA
> **Focus**: Enforce transactional integrity on database mutations, fix fallback loopholes, build vendor API features, and setup automated tests.

* **Task 4.1: Enforce SQL transactions on database updates**
  * Modify `approvePayment` and similar batch database routines to run inside `BEGIN`, `COMMIT`, and `ROLLBACK` transaction blocks.
* **Task 4.2: Extract duplicate hashing utilities**
  * DRY out the `hashMpin` and `verifyMpin` copy-paste duplicates by creating a single shared auth utility module.
* **Task 4.3: Implement active lot checks for dispatches**
  * Remove the arbitrary fallback row selector in `createDispatch`. Reject requests if the farmer does not have a matching lot.
* **Task 4.4: Remove hardcoded LAN callback URLs**
  * Eliminate the local developer IP address (`192.168.200.24`) in `payment.controller.js`. Resolve hosting host names dynamically from the request context or configuration environment variables.
* **Task 4.5: Secure mock checkout template**
  * Sanitize and contextually escape inputs to the mock checkout view page to prevent HTML/script injection.
* **Task 4.6: Database schema adjustments**
  * Create a dedicated `receiptUrl` column in the Payment model. Update functions to write to this column rather than using `note`.
* **Task 4.7: Fix dispatch notification routing**
  * Resolve and notify the correct vendor ID instead of sending alerts to the non-existent `'default_vendor'` profile.
* **Task 4.8: Clean up notification shadow users**
  * Eliminate dynamic shadow user insertions. Unify farmer credentials under a consistent schema model.
* **Task 4.9: Connect real Vendor API endpoints**
  * Replace the static hardcoded data on the `VendorScreen` with database queries for active saudas, pending dues, and logistics activity.
* **Task 4.10: Setup testing suite**
  * Install Jest, setup basic mocks, and write unit assertions for core ledger calculation logic and payment reconciliation.
