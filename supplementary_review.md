# Supplementary Architectural Review: AnnsetuNewApp
### Additional Deep-Dive Findings — Beyond the Initial Report

> This document covers **entirely new issues** not mentioned in the first architectural review. Every finding here is sourced from direct code inspection of files not analyzed in the first pass.

---

## Finding 1 — The Vendor Dashboard Is Entirely Fake (Hardcoded Mock Data)

**File**: [`VendorScreen.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/vendor/screens/VendorScreen.js) Lines 19-23, 172-186

The entire vendor-facing dashboard — "Active Sauda", "Pending Due", "In Transit", "Recent Activity" — displays hardcoded placeholder numbers that are never replaced with real data:

```javascript
// VendorScreen.js — Lines 19-23 — Static Mock Data
const [mandiPrices, setMandiPrices] = useState([
  { id: '1', commodity: 'Potato', variety: 'Pukhraj', mandi: 'Agra', price: 820, change: 15 },
  { id: '2', commodity: 'Potato', variety: 'Chipsona', mandi: 'Firozabad', price: 950, change: -20 },
  { id: '3', commodity: 'Onion', variety: '', mandi: 'Tundla', price: 1100, change: 45 },
]);

// Lines 172-186 — Hero metrics are permanently hardcoded
<Text style={styles.metricValue}>3</Text>          // Active Sauda: always 3
<Text style={styles.metricSubtext}>₹3,60,000</Text> // always ₹3,60,000
<Text style={[styles.metricValue, ...]}>₹1,20,000</Text> // Pending Due: always ₹1,20,000
<Text style={styles.metricValue}>1</Text>           // In Transit: always 1
```

And the "Recent Activity" section shows two static cards: "Room 1 / K12" with 300 bags and "Room 1 / B12" with 50 bags — also never fetched from the backend. The weather widget is a static `32°C / Clear sky`.

The Vendor role is completely non-functional. There is no API, no state management, and no data fetching for any of the core vendor metrics. "My Orders", "Khata", and "Payments" quick-action buttons all fire `Alert.alert('label', 'label action clicked!')` — placeholder stubs.

**Why this is critical:** If real vendor users log in, they are seeing numbers that mean absolutely nothing — financial figures that are fabricated. This is a trust and legal liability issue, not just a tech debt issue.

---

## Finding 2 — The `getNotifications` Endpoint Mutates Data Inside a GET Request

**File**: [`notification.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/notification/notification.controller.js) Lines 47-68

This is a fundamental violation of HTTP semantics. The `GET /api/notifications` endpoint contains active `DELETE` statements:

```javascript
// notification.controller.js — Lines 47-52 — DELETE inside GET
async function getNotifications(req, res) {
  // ...
  if (item.actionUrl && item.actionUrl.includes('/payment-verification/')) {
    const payCheck = await db.query('SELECT id FROM "Payment" WHERE id = $1', [paymentId]);
    if (payCheck.rows.length === 0) {
      await db.query('DELETE FROM "AppNotification" WHERE id = $1', [item.id]); // ← WRITE inside GET
      continue;
    }
  }
  // ...
  if (isProcessed) {
    await db.query('DELETE FROM "AppNotification" WHERE id = $1', [item.id]); // ← WRITE inside GET
    continue;
  }
}
```

**Why this is architecturally wrong:**

1. **HTTP GET must be idempotent and safe.** GET requests should have no side effects. Any caching layer (Nginx, Cloudflare, CDN, browser cache, React Query cache) is free to cache, de-duplicate, or pre-fetch GET requests. A DELETE operation inside a GET will silently not execute when served from cache.
2. **Every 5-second poll from every client fires these deletions.** The `getNotifications` endpoint is called every 5 seconds from three different screens simultaneously (`HomeScreen.js`, `VendorScreen.js`, `ColdStorageScreen.js`). This means the database is processing up to N `DELETE` queries per second where N = number of active users, all triggered by what looks like a read operation.
3. **It is not transactional.** If the query loop crashes midway, some stale notifications get deleted and others don't. The state is unrecoverable without manual intervention.
4. **It violates the principle of least surprise.** A developer adding a caching layer (which is the correct fix for the polling problem) will break data hygiene without knowing it.

**The Fix:** Create a separate `POST /api/notifications/cleanup` endpoint that runs as a background job (e.g., a nightly cron). The `GET /api/notifications` endpoint should only read and return data.

---

## Finding 3 — The "Shadow User" System: A Phantom Auth Layer

**File**: [`shared/notifications/notifications.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/shared/notifications/notifications.js) Lines 17-27

```javascript
// notifications.js — Lines 17-27
async function ensureUserForFarmer(farmerId) {
  try {
    const exists = await appNotificationRepository.getUserForFarmer(farmerId);
    if (exists) return;
    const farmer = await appNotificationRepository.getFarmerDetails(farmerId);
    const name = farmer ? farmer.name : 'Farmer';
    const coldStorageId = farmer ? farmer.coldStorageId : 'cmmp9txv0000ai3t4wush9trs';
    const now = new Date();
    // Creates a FAKE user with a fake email and 'dummy_hash' as the password
    await appNotificationRepository.insertShadowUser([
      farmerId, name, `farmer_${farmerId}@annsetu.local`, 'dummy_hash', 'OPERATOR', true, now, now, coldStorageId, 1
    ]);
  } catch (err) { ... }
}
```

Every time a notification is created for a farmer, the system first checks if the farmer has an entry in the `User` table. If not, it **creates a fake `User` record** with:
- A fabricated email address: `farmer_<id>@annsetu.local`
- A password hash of the string `'dummy_hash'` (which is not hashed at all — it is literally the string `dummy_hash`)
- A role of `'OPERATOR'`

This creates a class of zombie accounts in the `User` table that:
1. Cannot be logged into through any proper auth flow (they don't exist in Supabase auth).
2. Pollute the user table with non-real accounts, making user management impossible.
3. Have the role `OPERATOR`, which may have unexpected access implications depending on what RBAC rules reference this role.
4. The `'dummy_hash'` string is a hardcoded fake password that is stored in plaintext in the database. If the `User` table ever becomes accessible (e.g., a data breach), these accounts could be targeted.

This workaround exists because the app has two separate user identity systems (Supabase Auth for cold storage login, custom MPIN for farmers) and the notification system only knows about the `User` table model. The shadow user system is a band-aid over the split identity problem identified in the first report.

---

## Finding 4 — The Auto-SMS/Email System Has a Broken Module Import

**File**: [`shared/notifications/notifications.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/shared/notifications/notifications.js) Lines 46, 68

```javascript
// notifications.js — Line 46 — wrong import path
const db = require('../../db');       // ← Does this file exist?
const { sendSMS, sendEmail } = require('../notification');  // ← Does this exist?
```

The file imports from `'../../db'` — two directories up from `shared/notifications/`. The actual database config is at `backend/config/database.js`. There is no `backend/db.js` file in the project. This import will throw `Error: Cannot find module '../../db'` at runtime.

Similarly, `require('../notification')` — one directory up from `shared/notifications/` — would be `shared/notification.js`. There is no `notification.js` in `shared/` either.

This means **the entire auto-SMS and auto-Email delivery system silently fails on every single notification dispatch**. Every `createAppNotification` call has a `try/catch` that swallows this error with `console.warn('[Auto Notification Hook] Error in background dispatch:')`. Farmers never receive SMS/email alerts because the code that sends them throws a module-not-found error that is silently caught.

This is a perfect example of error swallowing masking a production failure. The system *appears* to be sending notifications (the notification is saved to the database) but the outbound delivery has been silently broken for every user since the feature was written.

---

## Finding 5 — Amad Controller Has a Hardcoded coldStorageId

**File**: [`amad.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/amad/amad.controller.js) Line 12

```javascript
// amad.controller.js — Line 12
const coldStorageId = 'cmmp9txv0000ai3t4wush9trs'; // ← hardcoded for every new Amad entry
```

Every time a new stock inward entry (Amad) is created, it is unconditionally assigned to the single hardcoded cold storage `'cmmp9txv0000ai3t4wush9trs'`. This means:

1. **The entire Amad system is only functional for one specific cold storage** — "SN Sharma Cold Storage." Any other cold storage facility that onboards will have their inward bookings silently assigned to SN Sharma's account.
2. **The `coldStorageId` is not taken from the request body, the authenticated session, or any dynamic source.** The request body does not include a `coldStorageId` field at all.
3. **This is a multi-tenancy failure.** The cold storage management SaaS model requires each cold storage to only see their own farmers' stock. With this hardcoding, every Amad lot ever created belongs to one tenant.

The same hardcoded constant appears across `dispatch.controller.js` (line 123), `storage.controller.js` (line 43), and the `notifications.js` shared service. The system is effectively a single-tenant application masquerading as a multi-tenant SaaS.

---

## Finding 6 — The `getHoldings` API Is a Full-Table Scan With No Tenant Filter

**File**: [`amad.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/amad/amad.controller.js) Lines 37-54

```javascript
// amad.controller.js — getHoldings
async function getHoldings(req, res) {
  try {
    const rows = await amadRepository.getHoldingsData(); // ← NO filters passed
    // ...
  }
}
```

The `GET /api/holdings` endpoint returns **all holdings from all cold storages** in the entire database, with zero filtering. In `ColdStorageScreen.js`:

```javascript
// ColdStorageScreen.js — Line 127
const holdings = await fetchHoldings();        // ← Fetches ALL holdings
const filteredHoldings = (holdings || [])
  .filter(h => h.cold_storage_id === targetId) // ← Filters client-side in JS
```

And in `useStorageTabDashboard.js`, the same pattern is used for the farmer view. This means:
1. The full `AmadLot` table (potentially thousands of rows at scale) is serialized to JSON and transmitted over the network to the mobile device.
2. The mobile device then filters this dataset in JavaScript.
3. **Farmer A's stock data is transmitted to Farmer B's device** — it is just discarded before being displayed. This is a data privacy violation. Any user who intercepts their own network traffic using a proxy (e.g., Charles Proxy) can see every lot in the entire system.

**The Fix:** The `getHoldings` endpoint must accept `coldStorageId` or `farmerId` as a query parameter and apply it as a `WHERE` clause in the SQL query.

---

## Finding 7 — StockTab Renders the Same "Age" Column Twice

**File**: [`StockTab.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/inventory/screens/StockTab.js) Lines 75-93

```javascript
// StockTab.js — Lines 75-93 — 4 columns, 2 are "Age"
<View style={s.gridRow}>
  <View style={s.gridCol}>
    <Text style={s.gridLabel}>Bags</Text>
    <Text style={s.gridValue}>{item.bags}</Text>
  </View>
  <View style={s.gridCol}>
    <Text style={s.gridLabel}>Weight</Text>
    <Text style={s.gridValue}>{item.weight}</Text>
  </View>
  <View style={s.gridCol}>
    <Text style={s.gridLabel}>Age</Text>            {/* ← Column 3: Age */}
    <Text style={s.gridValue}>{item.age} days</Text>
  </View>
  <View style={s.gridCol}>
    <Text style={s.gridLabel}>Age</Text>            {/* ← Column 4: ALSO Age */}
    <Text style={[s.gridValue, ...]}>
      {item.age}d                                   {/* ← same value, different format */}
    </Text>
  </View>
</View>
```

Every stock card in the inventory view shows 4 columns: Bags, Weight, **Age**, and **Age again**. The fourth column ("Age" with color warning after 60 days) is an exact duplicate of the third column. One of these was supposed to be a different metric (possibly "Variety" or "Room"). This is a UI bug in production that makes the stock cards look visually broken and wastes a quarter of the layout.

---

## Finding 8 — Push Notification Delivery Blocks the HTTP Request Thread

**File**: [`shared/notifications/notifications.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/shared/notifications/notifications.js) Lines 36-50

```javascript
async function createAppNotification({ ... }) {
  // ... saves to DB ...
  if (result && userId) {
    try {
      const { sendPushNotification } = require('./pushNotifications');
      sendPushNotification(userId, title, message, { actionUrl }); // ← Fire-and-forget? No.
    } catch (pushErr) { ... }

    try {
      // More DB queries for SMS/email delivery
      const farmerRes = await db.query(...); // ← Awaited!
      const userRes = await db.query(...);   // ← Awaited!
      await sendSMS(...);                    // ← Awaited!
      await sendEmail(...);                  // ← Awaited!
    } catch (autoNotifErr) { ... }
  }
  return result;
}
```

The `createAppNotification` function is called from within almost every controller (dispatch, amad, farmer register, payment, cron) as an awaited call. This function then:
1. Saves the notification record.
2. Attempts a push notification (fire-and-forget at least).
3. **Awaits two additional DB queries** to get the farmer's phone and email.
4. **Awaits an SMS send call** (which itself is an outbound HTTP request to an SMS provider).
5. **Awaits an email send call** (which is an SMTP connection).

This means a simple `POST /api/amad` (create stock inward) blocks its response until:
- The notification is written to DB ✓
- Push token fetched from DB (extra round trip)
- Farmer phone/email fetched from DB (extra round trip)
- Outbound SMS HTTP request completes (external network, potentially 2-5 seconds)
- SMTP email connection opens and mail is sent (external network, potentially 3-10 seconds)

An endpoint that should respond in < 200ms is being held open for up to **10 seconds** due to chained external network calls.

**The Fix:** Use a job queue (Bull, BullMQ, or even a simple `setImmediate`) to push notification delivery work off the request thread:

```javascript
// Instead of awaiting:
await sendPushNotification(userId, title, message);
// Use fire-and-forget:
setImmediate(() => sendPushNotification(userId, title, message));
// Or better: enqueue a job
notificationQueue.add({ userId, title, message, type: 'push' });
```

---

## Finding 9 — The Mandi Service Fetches 1,000 Rows Per Request, No Pagination

**File**: [`mandi.service.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/mandi/mandi.service.js) Line 9

```javascript
// mandi.service.js — Line 9
const params = {
  'api-key': apiKey,
  format: 'json',
  limit: 1000, // Query up to 1000 records to fetch all crops/mandis
};
```

Every mandi price request fetches 1,000 records from the government API in a single HTTP call. The API response is then fully deserialized into memory, mapped over, and returned to the client. There is no:
- Pagination (if the data grows beyond 1,000 records, the most recent records are silently dropped)
- Caching (this 1,000-row fetch happens on every single client request)
- Streaming (the entire response must fit in memory before any record is returned)

The VendorScreen compounds this by making **two sequential calls** to this endpoint on mount — one for Potato prices and one for Onion prices:

```javascript
// VendorScreen.js — Lines 31-80
const potatoData = await fetchMandiPrices('Uttar Pradesh', 'Potato');  // 1000-row fetch
const onionData  = await fetchMandiPrices('Uttar Pradesh', 'Onion');   // another 1000-row fetch
```

Two sequential 1,000-row API calls on screen load, with no caching, means every time any vendor opens their dashboard, the backend makes two outbound HTTP requests to `api.data.gov.in`, deserializes 2,000 records, and transmits the full payload to the mobile client.

---

## Finding 10 — The Weather API Key Is Called Directly From the Mobile Client

**File**: [`weatherService.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/weather/services/weatherService.js) Lines 1, 13

```javascript
// weatherService.js — Direct client-to-API call with embedded key
import { WEATHER_API_URL, WEATHER_API_KEY } from '../../../core/network/config';

const url = `${WEATHER_API_URL}?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}...`;
const response = await fetch(url); // ← Mobile device calls WeatherAPI.com directly
```

The `WEATHER_API_KEY` (`'cc98b5f11d594fa893f52703261806'`) is embedded in the mobile bundle and used to make direct HTTP calls to `weatherapi.com` from the mobile device. This means:

1. **The API key is exposed in every network request.** Anyone running a proxy tool on their device (Charles, mitmproxy) can trivially extract the key from the plaintext HTTPS request URL.
2. **There is no rate-limiting protection.** WeatherAPI's free tier has 1,000,000 calls/month. If users open the app frequently, or if a bad actor extracts the key and scripts it, the quota will be exhausted, breaking the feature for all users.
3. **The mobile app bypasses your backend entirely for weather data**, meaning you cannot add caching, logging, or quota management without refactoring.

The correct pattern is to proxy weather requests through your backend:
- Client calls `GET /api/weather?city=Tundla`
- Backend calls `weatherapi.com` with the server-side secret key
- Backend caches the result for 30 minutes (weather doesn't change per-minute)
- Backend returns the weather data to the client

The key never leaves the server. Usage can be rate-limited per user.

---

## Finding 11 — No Input Validation Anywhere in the Codebase

**File**: All backend controllers

The backend has no input validation library. Validation is done as ad-hoc `if (!field)` checks at the top of each controller function, which only guards against missing fields. There is no:

- **Type validation**: A caller can send `bags: "banana"` to `createDispatch` and the code will call `parseInt("banana", 10)` → `NaN`, which will be inserted into the database as `NaN` without error.
- **Range validation**: A payment amount of `-999999` or `9999999999` is accepted as valid.
- **Format validation**: Phone number fields accept any string. The `resetMpin` endpoint checks `phone.length < 10` client-side but not server-side.
- **Enum validation**: The `type` field on notifications, `status` on dispatches, and `paymentMode` on payments all accept any string value. Sending `type: "DROP TABLE"` is accepted.
- **Sanitization**: There is no HTML/script sanitization on any free-text field (e.g., `message`, `note`, `dispatchTo`). If any of these values are ever rendered in a web interface, they are XSS injection vectors.

**The Fix — Zod schema validation middleware:**

```javascript
// shared/validation/schemas.js
const { z } = require('zod');

const createDispatchSchema = z.object({
  farmerId: z.string().cuid(),
  coldStorageId: z.string().cuid(),
  commodity: z.string().min(1).max(50),
  bags: z.number().int().positive().max(10000),
  vehicleNumber: z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/).optional(),
});

// In the route file:
app.post('/dispatches', validate(createDispatchSchema), createDispatch);
```

---

## Finding 12 — No Rate Limiting on Authentication Endpoints

**File**: [`backend/server.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/server.js), [`farmer.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/farmer/farmer.controller.js)

The `POST /api/farmers/login-mpin` and `POST /api/farmers/reset-mpin` endpoints have no rate limiting. An attacker who wants to brute-force a 4-digit MPIN has only 10,000 possible combinations. With no rate limiting:

```bash
# A script to brute-force a 4-digit MPIN in seconds
for mpin in $(seq -w 0000 9999); do
  curl -s -X POST http://your-server/api/farmers/login-mpin \
    -H 'Content-Type: application/json' \
    -d "{\"phone\": \"9876543210\", \"mpin\": \"$mpin\"}" &
done
```

With 10,000 parallel requests and no lockout mechanism, this attack takes seconds and gives complete account access. The MPIN is 4 digits, which makes this brute-force even trivially fast compared to a standard 6-8 character password.

**The Fix:**
1. Add `express-rate-limit` with a tight policy on auth routes: 5 attempts per 15 minutes per IP.
2. Add an account lockout: after 5 failed MPIN attempts, lock the account for 30 minutes.
3. Upgrade to a 6-digit MPIN minimum to increase the brute-force space from 10,000 to 1,000,000 combinations.

---

## Finding 13 — The `useKhataPayment` Hook Returns a Flat Object of All State Setters

**File**: [`useKhataPayment.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/farmer/hooks/useKhataPayment.js) Lines 265-293

```javascript
return {
  state: {
    showSummary, setShowSummary,
    showVerificationForm, setShowVerificationForm,
    verificationStep, setVerificationStep,
    utrNumber, setUtrNumber,
    receiptFile, setReceiptFile,
    receiptFileName, setReceiptFileName,
    paymentDate, setPaymentDate,
    datePickerVisible, setDatePickerVisible,
    lang, setLang,
    pickerDay, setPickerDay,
    pickerMonth, setPickerMonth,
    pickerYear, setPickerYear,
    paymentId, setPaymentId,
    verificationSuccessModalVisible, setVerificationSuccessModalVisible,
    paymentUrl, setPaymentUrl,
    razorpayOrderData, setRazorpayOrderData,
    isOnlineSuccess, setIsOnlineSuccess,
    pendingRent,
    paymentAmount, setPaymentAmount
  },
  handlers: { ... }
};
```

The hook exposes **19 state values and their raw setter functions** directly to the consuming component (`KhataTab`). This is an anti-pattern for two reasons:

1. **Exposing raw setters breaks encapsulation.** Any component that uses this hook can call `setRazorpayOrderData(null)` or `setPaymentId('fake_id')` directly, bypassing the state machine logic inside the hook. The hook's internal invariants can be violated from outside.
2. **The hook manages 19 pieces of state.** This is a strong signal that the payment flow should be modelled as a **finite state machine** (FSM) rather than a bag of booleans. The states `showSummary`, `showVerificationForm`, `verificationStep`, `isOnlineSuccess` are mutually exclusive flow stages. A Zustand slice with an explicit `step: 'idle' | 'summary' | 'verificationForm' | 'success'` field eliminates 4 boolean states, prevents impossible states (e.g., `showSummary = true` and `showVerificationForm = true` simultaneously), and makes the payment flow explicit and testable.

---

## Finding 14 — TypeScript Is Installed But Not Used

**File**: [`mobile/package.json`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/package.json) Lines 38-39

```json
"devDependencies": {
  "@types/react": "~19.1.10",
  "typescript": "~5.9.2"
}
```

TypeScript and React types are installed as dev dependencies, but **every source file in the project uses `.js` extension**, not `.tsx`/`.ts`. This means:
- TypeScript provides zero type safety to the project despite being installed.
- The `@types/react` dependency is wasted.
- There is no `tsconfig.json` enforcing strict type checking.

The codebase would benefit enormously from TypeScript. For example, the role-naming inversion bug (Finding 3 in the original report) would have been caught at compile time if roles were typed as:

```typescript
type UserRole = 'FARMER' | 'VENDOR' | 'COLD_STORAGE_FACILITY';
// The assignment setRole('ColdStorage') would be a type error
```

Similarly, the hook returning 19 raw state setters would be typed, making misuse discoverable.

---

## Finding 15 — There Are Zero Tests in the Entire Codebase

**Files**: `backend/package.json`, `mobile/package.json`

Neither the backend nor the mobile app has any testing infrastructure:
- No test runner (`jest`, `vitest`, `mocha`) is listed in either `package.json`.
- No `__tests__` directory or `*.test.js` / `*.spec.js` files exist anywhere in the project.
- No `test` script exists in either `package.json`.

This means:
- The financial ledger calculation logic in `farmer.repository.js` (the running balance computation) has never been verified to be correct.
- The `verifyMpin` function, which is critical for authentication, has no unit tests confirming its behavior against edge cases (null, empty string, non-64-char hashes).
- The `updatePaymentStatus` function — which applies payments against bills in a loop — has no tests confirming it handles partial payments, zero-amount bills, or concurrent calls correctly.
- There is no way to verify that a change to one module doesn't silently break another without manually testing the full app.

The absence of tests combined with the financial nature of this application (managing real farmer payments, rent bills, and dispatch approvals) is a critical quality assurance gap.

---

## Finding 16 — `RegisterScreen.js` Contains ~700 Lines of Static District Data as Inline Code

**File**: [`RegisterScreen.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/auth/screens/RegisterScreen.js) Lines 25-54

The `RegisterScreen.js` file embeds the complete list of all Indian districts for all 28 states directly as a hardcoded JavaScript constant object (`DISTRICTS_BY_STATE`) inside the screen component file. This is ~500 lines of data inside a component file that is 637 lines long, making the actual screen logic (which starts at line ~57) nearly impossible to locate.

**Problems:**
1. **Bundle size bloat.** This entire dataset (~15KB of district names) is bundled into the initial JavaScript chunk and parsed on every app launch, even for users who never use the registration screen.
2. **Maintainability.** If a new district is added or renamed (e.g., Prayagraj replacing Allahabad), a developer must find it among 500 lines of inline data.
3. **Data belongs in data files, not component files.** This should be a separate `constants/districts.json` file, lazy-loaded only when the registration screen is mounted.

---

## Finding 17 — `ColdStorageScreen` Fetches `fetchFarmerLedger('default_farmer')` on Mount

**File**: [`ColdStorageScreen.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/cold-storage/screens/ColdStorageScreen.js) Line 129

```javascript
// ColdStorageScreen.js — Line 129
fetchFarmerLedger('default_farmer').catch(() => []),
```

The Cold Storage Manager dashboard fetches a ledger for the hardcoded string `'default_farmer'`. This is an API call that:
1. Always fires for every cold storage login.
2. Always returns an empty array (there is no farmer with ID `'default_farmer'`).
3. Is a wasted network round-trip on every single dashboard load.
4. The returned `ledger` array is set into `ledgerList` state, which is then passed to `KhataTab` where it renders an empty ledger.

This appears to be a development stub that was accidentally left in the production code path.

---

## Finding 18 — Notification Deduplication Uses a Fragile String-Matching Regex

**File**: [`notification.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/notification/notification.controller.js) Lines 55-67

```javascript
// notification.controller.js — Lines 55-62
const match = item.message.match(/dispatch\s+(?:of\s+)?(\d+)\s+bags/i);
if (match && (
  item.title.toLowerCase().includes('dispatch') ||
  item.title.toLowerCase().includes('approval') ||
  item.title.toLowerCase().includes('approved')
)) {
  const bagsCount = parseInt(match[1], 10);
  const isProcessed = processedTxs.some(tx => tx.packetsDispatched === bagsCount);
  // If any dispatch in the system matches that bag count, delete this notification
```

Stale notification detection works by:
1. Parsing the notification message with a regex to extract the bag count number.
2. Checking if **any** transaction in the database matches that bag count.

This is critically flawed:
- If Farmer A dispatched 300 bags (transaction now `DISPATCHED`) and Farmer B has a **pending** dispatch approval for 300 bags, Farmer B's pending notification will be deleted because the regex sees "300 bags" and finds a processed transaction with 300 bags — but it's a different farmer's transaction.
- The deduplication does not check if the bag count belongs to the **same farmer**, only if any processed transaction in the entire system has that count.
- Any farmer dispatching 300 bags will cause all pending 300-bag notifications for all farmers to be deleted.

This is a data correctness bug that could cause farmers to miss authorization requests for their own dispatches.

---

## Comprehensive Additional Technical Debt Table

| # | File | Severity | New Issue | Fix |
|---|---|---|---|---|
| 1 | `VendorScreen.js` | 🔴 Critical | Entire Vendor dashboard is hardcoded mock data — no real API integration | Build vendor API endpoints and connect them |
| 2 | `notification.controller.js` | 🔴 Critical | `DELETE` statements inside a `GET` request handler | Move cleanup to a background job / separate endpoint |
| 3 | `shared/notifications/notifications.js` | 🔴 Critical | Auto-SMS/Email system silently broken — wrong module import paths (`../../db`) | Fix import paths; add integration test |
| 4 | `shared/notifications/notifications.js` | 🟠 High | Shadow `User` records with `dummy_hash` "password" | Unify auth to single identity system; remove shadow users |
| 5 | `amad.controller.js` | 🟠 High | `coldStorageId` hardcoded to single tenant — multi-tenancy failure | Pass `coldStorageId` from authenticated session |
| 6 | `amad.controller.js` | 🟠 High | `getHoldings` returns entire table with no filter — data privacy leak | Add `farmerId` / `coldStorageId` WHERE clause |
| 7 | `shared/notifications/notifications.js` | 🟠 High | Push/SMS/Email delivery awaited on HTTP request thread — 10s response times | Move to job queue / fire-and-forget |
| 8 | `mandi.service.js` + `VendorScreen.js` | 🟠 High | 1,000-row government API fetch with no caching, called twice on screen load | Cache with Redis TTL; paginate API calls |
| 9 | `weatherService.js` + `config.js` | 🟠 High | Weather API key in mobile bundle, client calls API directly | Proxy through backend; cache weather response 30 min |
| 10 | All backend controllers | 🟠 High | Zero input validation — type, range, format, enum fields all unchecked | Implement Zod schema validation middleware |
| 11 | `server.js` | 🟠 High | No rate limiting on auth endpoints — 4-digit MPIN brute-forceable in seconds | `express-rate-limit` on `/login-mpin`, account lockout after 5 failures |
| 12 | `notification.controller.js` | 🟠 High | Notification deduplication uses bag-count regex that cross-contaminates tenants | Dedup by `farmerId + bagCount + lotId`, not global bag count |
| 13 | `StockTab.js` | 🟡 Medium | "Age" column rendered twice — 4th column is duplicate of 3rd | Replace duplicate with Variety or Room column |
| 14 | `useKhataPayment.js` | 🟡 Medium | Hook exposes 19 raw state setters — impossible states possible | Model payment flow as FSM with explicit `step` enum |
| 15 | `ColdStorageScreen.js` | 🟡 Medium | Fetches `fetchFarmerLedger('default_farmer')` on every mount — wasted call | Remove the hardcoded `'default_farmer'` fetch |
| 16 | `RegisterScreen.js` | 🟡 Medium | ~500 lines of district data hardcoded inline in component file | Extract to `constants/districts.json`, lazy-load |
| 17 | `package.json` (both) | 🟡 Medium | TypeScript installed but entire codebase is `.js` — zero type safety | Migrate to `.tsx`/`.ts`; enable strict mode in `tsconfig.json` |
| 18 | Both repos | 🔴 Critical | Zero tests anywhere in the codebase — financial logic is unverified | Establish Jest; unit test `getFarmerLedger`, `verifyMpin`, `updatePaymentStatus` |
