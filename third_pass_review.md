# Third-Pass Architectural Review: AnnsetuNewApp
### Additional Deep-Dive Findings — Beyond Both Previous Reports

> All issues here are **new** — not present in either of the two previous documents.

---

## Finding 1 — OTP Verification is Completely Mocked: Any Code Passes

**File**: [`OtpScreen.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/auth/screens/OtpScreen.js) Lines 53-61

```javascript
// OtpScreen.js — Lines 53-61
try {
    await supabase.auth.verifyOtp({
        phone: '+91' + phone,
        token: otpCode,
        type: 'sms',
    });
} catch (err) {
    // ANY Supabase OTP error is silently caught and IGNORED
    console.log('Supabase verifyOtp bypassed (mocked OTP):', err.message);
}

// setVerified(true) is called UNCONDITIONALLY — whether Supabase verified or not
setVerified(true);
```

The OTP verification screen calls Supabase, but then **unconditionally marks the user as verified** regardless of whether Supabase accepted or rejected the OTP. If Supabase throws any error (invalid OTP, expired OTP, unregistered number, network failure), the error is caught and logged, then execution falls through to `setVerified(true)`.

**This means any 6-digit code — `111111`, `999999`, `000000` — will successfully verify any phone number.** An attacker who knows another farmer's phone number can register or log into their account by entering any arbitrary 6 digits on the OTP screen. Phone OTP authentication provides zero actual security in this codebase.

---

## Finding 2 — MPIN Reset Validates OTP Against a Hardcoded Literal `'1234'`

**File**: [`farmer.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/farmer/farmer.controller.js) Lines 148-150

```javascript
// farmer.controller.js — Lines 148-150
async function resetMpin(req, res) {
  const { phone, otp, newMpin } = req.body;
  // ...
  if (otp !== '1234') {
    return res.status(400).json({ success: false, error: 'Invalid verification OTP.' });
  }
```

The `POST /api/farmers/reset-mpin` endpoint is meant to reset a farmer's 4-digit MPIN after verifying their identity with a one-time OTP. However, the "verification" simply checks if `otp === '1234'` — a hardcoded literal string.

Anyone who knows the OTP is `'1234'` can reset **any farmer's or cold storage's MPIN** to anything they want, simply by knowing the target's phone number. This is not a development placeholder that's gated — it is the only validation on an account takeover endpoint that affects live user credentials.

**Combined with Finding 1**: An attacker can enumerate any phone number, pass OTP verification automatically, then reset the account's MPIN to anything using this hardcoded OTP. There is zero friction to a complete account takeover.

---

## Finding 3 — The User-Role Service Maps Farmers to `'ColdStorage'` Role (Naming Collision Bug)

**File**: [`user-role.service.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/user-role/user-role.service.js) Lines 6-12

```javascript
// user-role.service.js — Lines 6-12
async function determineUserRole(phone) {
  const cleanPhone = phone.replace('+91', '').trim();

  const hasCsRole = await userRoleRepository.checkColdStorageOnboarding(cleanPhone);
  if (hasCsRole) return 'ColdStorageFacility';

  const hasFarmerRole = await userRoleRepository.checkFarmer(cleanPhone);
  if (hasFarmerRole) return 'ColdStorage';  // ← Farmer is labeled 'ColdStorage'?

  return 'ColdStorage';  // ← Unregistered users also return 'ColdStorage'
}
```

This is the same naming collision bug documented in `farmer.controller.js` (where `role: 'ColdStorage'` is returned for farmers), but in `user-role.service.js` it is **doubly broken**: 

1. A farmer is returned as `'ColdStorage'` — wrong name.
2. **An unregistered user who has never signed up also returns `'ColdStorage'`** — the default case `return 'ColdStorage'` means any unknown phone number is treated as a farmer.
3. There is no `return 'Vendor'` path, even though `Vendor` is a recognized role in the UI. The vendor role appears entirely disconnected from this service.

This `GET /api/user-role` endpoint is the entry point for the login flow. Any phone number typed into the login screen will get `'ColdStorage'` returned for it, which means any random number could potentially log in as a "farmer" and access farming data.

---

## Finding 4 — Dispatch `createDispatch` Has a "Fallback B": Linking a Dispatch to a Completely Random Lot

**File**: [`dispatch.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/dispatch/dispatch.controller.js) Lines 109-114

```javascript
// dispatch.controller.js — Lines 109-114
} else {
  // Fallback B: Any lot in the database to satisfy NOT NULL constraint
  lotRes = await db.query(`SELECT id FROM "AmadLot" LIMIT 1`);
  if (lotRes.rows.length > 0) {
    lotId = lotRes.rows[0].id;
  }
}
```

When a cold storage creates a dispatch request for a farmer, the code looks for a matching lot in this order:
1. A lot for this farmer matching the commodity ✓
2. Any lot for this farmer at all
3. **Fallback B: The very first row in the entire `AmadLot` table**, using `SELECT id FROM "AmadLot" LIMIT 1` — regardless of farmer, cold storage, or commodity.

This means if Farmer A has no stock lots and Farmer B's potato lot is the first row in the `AmadLot` table, a dispatch request for Farmer A will be linked to Farmer B's lot. Farmer A's dispatch will appear on Farmer B's stock history. Inventory tracking becomes completely corrupted.

The comment even explicitly acknowledges this is wrong: `"Any lot in the database to satisfy NOT NULL constraint"`. This is database integrity bypassed by a hack, not fixed architecturally.

---

## Finding 5 — Developer's Personal LAN IP Hardcoded in Production Payment Code

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 41-44, 60-63

```javascript
// payment.controller.js — Lines 41-44
let serverIp = req.headers.host || '192.168.200.24:3001';
if (serverIp.includes('localhost') || serverIp.includes('127.0.0.1')) {
  serverIp = '192.168.200.24:3001'; // ← Developer's LAN address
}
const callbackUrl = `http://${serverIp}/api/payments/success`;
```

The payment callback URL — the URL that Razorpay redirects to after payment — is constructed using a **hardcoded local area network IP address** `192.168.200.24:3001`. This is the developer's personal machine's IP on their home/office network.

This means:
1. **In production**, when a farmer pays through Razorpay's hosted payment link, Razorpay redirects to `http://192.168.200.24:3001/api/payments/success` — a private LAN address that is unreachable from the internet.
2. The payment will complete on Razorpay's end but the callback will time out. The `Payment` record will never be updated to `PAID` via the redirect path.
3. **The payment will appear as still pending** in the farmer's account even after real money was debited.
4. This address appears **twice** in the same function — once for the primary construction and once inside the `paymentLink.create` block, confirming it is not a one-off typo.

---

## Finding 6 — Mock Razorpay Credentials Committed to Source

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 10-11

```javascript
// payment.controller.js — Lines 10-11
const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_DakshSethi123';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_daksh_sethi';
```

The Razorpay credentials use a naming convention (`DakshSethi123`, `daksh_sethi`) that suggests these are personal developer credentials committed to source, not generic placeholders. Additionally:
- `mock_secret_daksh_sethi` is the key secret. The code detects mock mode by checking `process.env.RAZORPAY_KEY_SECRET === 'mock_secret_daksh_sethi'` — meaning if no env var is set in production, the entire payment system silently runs in **mock mode** and no real payments are created.
- The webhook secret similarly defaults to `'webhook_secret_daksh_sethi'` (line 343), and mock mode is triggered when this default is detected: `const skipVerify = webhookSecret === 'webhook_secret_daksh_sethi'`.

**If someone deploys this backend without setting environment variables, the webhook endpoint accepts all incoming webhooks without signature verification** — meaning anyone can forge a webhook to the endpoint and mark any payment as `PAID`.

---

## Finding 7 — `approvePayment` Updates Bills in a Loop Without a Database Transaction

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 655-692

```javascript
// payment.controller.js — Lines 655-692 — No BEGIN/COMMIT
async function approvePayment(req, res) {
  // Step 1: UPDATE Payment to APPROVED
  await db.query('UPDATE "Payment" SET "status" = \'APPROVED\' WHERE id = $1', [id]);

  // Step 2: Loop over bills and update each one individually
  for (const bill of nikasiRes.rows) {
    if (remainingAmount >= due) {
      await db.query('UPDATE "NikasiTransaction" SET "balanceDueAmount" = 0 ...', [...]);
      remainingAmount -= due;
    } else {
      await db.query('UPDATE "NikasiTransaction" SET "balanceDueAmount" = $1 ...', [...]);
      remainingAmount = 0;
    }
  }
  // No COMMIT. No ROLLBACK on failure.
}
```

The `approvePayment` function marks a payment as `APPROVED` and then applies the payment amount against bills in a `for` loop. There is **no database transaction wrapping this logic**. If the server crashes, network times out, or a DB error occurs mid-loop:
- The payment is already marked `APPROVED`.
- Some bills have been partially cleared.
- Other bills still show the full outstanding amount.
- The farmer's ledger balance is now permanently inconsistent.
- Re-running `approvePayment` on the same payment will double-apply the amount to the remaining bills.

Contrast this with `updatePaymentStatus` in `payment.repository.js` (the online payment path), which correctly uses `BEGIN`/`COMMIT`/`ROLLBACK`. The manual offline payment approval path was written separately without this protection.

---

## Finding 8 — `deliverDispatch` Has No MPIN Authorization

**File**: [`dispatch.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/dispatch/dispatch.controller.js) Lines 260-313

```javascript
// dispatch.controller.js — Lines 260-313
async function deliverDispatch(req, res) {
  const { id } = req.params;
  // No body read. No MPIN check. No authentication of any kind.
  try {
    const sql = `UPDATE "NikasiTransaction" SET "status" = 'DISPATCHED' ...`;
    const result = await db.query(sql, [id]);
    // ...
  }
}
```

The `POST /api/dispatches/:id/deliver` endpoint — which marks a batch of farmer stock as physically dispatched/delivered — requires **no authentication whatsoever**. Any person who knows a dispatch transaction ID can call this endpoint and mark it as delivered, permanently moving stock out of the farmer's account.

In contrast, `approveDispatch` does check an MPIN. `deliverDispatch` — the final, irreversible state transition — does not. The dispatch ID format (`NK-1736456789123`) is predictable (timestamp-based), making enumeration trivial.

---

## Finding 9 — Profile Tab Has 7 Dead Menu Items, All Are Tappable No-Ops

**File**: [`ProfileTab.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/farmer/screens/ProfileTab.js) Lines 116-132

```javascript
// ProfileTab.js — Lines 116-132
{menuItems.map((item, idx) => (
  <View key={item.id}>
    <TouchableOpacity
      style={s.menuItem}
      activeOpacity={0.7}
      // ← No onPress prop. Nothing happens when tapped.
    >
      ...
    </TouchableOpacity>
  </View>
))}
```

The Profile tab displays 7 menu items:
- Edit Profile
- Contact & Communication
- Security & KYC
- My Documents
- Reports & Analytics
- Support / सहायता
- App Settings

Every single one of these is a `TouchableOpacity` with no `onPress` handler. Tapping any of them does absolutely nothing. The entire Profile section is a visual mockup with no functionality behind it.

Furthermore, line 95 shows `<Text style={s.kycText}>KYC Verified</Text>` — the KYC badge is **always hardcoded as "KYC Verified"** regardless of whether the actual farmer has submitted any KYC documents. Every farmer account in the app displays "KYC Verified" permanently, even newly registered ones.

---

## Finding 10 — Mandi City Dropdown Only Has Data for 10 States

**File**: [`MandiTab.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/mandi/screens/MandiTab.js) Lines 45-56

```javascript
// MandiTab.js — Lines 45-56
const stateMarkets = {
  'Uttar Pradesh': ['Agra', 'Firozabad', 'Tundla', 'Aligarh', 'Hathras'],
  'Rajasthan': ['Jaipur', 'Alwar', 'Bharatpur', 'Kota', 'Jodhpur'],
  'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda'],
  'Haryana': ['Karnal', 'Ambala', 'Hisar', 'Rohtak', 'Panipat'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Ujjain', 'Jabalpur', 'Gwalior'],
  'Maharashtra': ['Pune', 'Nashik', 'Nagpur', 'Mumbai', 'Aurangabad'],
  'Gujarat': ['Ahmedabad', 'Rajkot', 'Surat', 'Vadodara', 'Mehsana'],
  'Bihar': ['Patna', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Purnia'],
  'West Bengal': ['Kolkata', 'Siliguri', 'Burdwan', 'Kharagpur', 'Howrah'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Belagavi', 'Mangaluru'],
};
const markets = ['All', ...(stateMarkets[selectedState] || [])];
```

India has 28 states + 8 union territories. The Mandi price filter supports only 10 of them. If a user selects any of the other 18 states, the `stateMarkets[selectedState]` lookup returns `undefined`, so the `|| []` fallback is used and the city dropdown shows only `['All']` — no cities.

The `RegisterScreen.js` correctly contains all 28 states and their districts as a lookup table. That same dataset was never reused here. The Mandi tab is also called as a wrapped async function (`async (selectedState) => { ... }`) with a `try/catch`, but the function body never actually `await`s anything — the entire `setCitiesLoading` dance is performed around synchronous code with no actual async work.

---

## Finding 11 — The Mock Payment Checkout Page Is an HTML Injection Surface

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 394-538

```javascript
// payment.controller.js — Lines 504, 527
res.send(`
  <html>
    ...
    <div class="amount-value">₹${amount.toLocaleString('en-IN', ...)}</div>
    ...
    window.location.href = '/api/payments/success?order_id=${orderId}&payment_id=' + form.razorpay_payment_id.value;
    ...
  </html>
`);
```

The mock checkout page is rendered via ES6 template literals by directly interpolating `orderId` and `amount` into raw HTML. While `amount` comes from the database (numeric) and `orderId` is validated as starting with `order_mock_`, the `orderId` is also embedded directly into a JavaScript `href` string at line 527 without escaping.

If the `orderId` format changes or is influenced by external input, this is a stored XSS injection vector — the unescaped string is interpolated into an inline `<script>` block rendered by Express to a WebView.

Additionally, the mock checkout page is accessible to anyone who knows the endpoint pattern `GET /api/payments/mock-checkout/:orderId`. There is no check that the requester is the farmer who owns that payment record.

---

## Finding 12 — Payment Receipt Is Stored in the `note` Field (Semantic Corruption)

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 262-267

```javascript
// payment.controller.js — Lines 262-267 — Receipt path stored in 'note'
await db.query(
  `UPDATE "Payment"
   SET "status" = 'PENDING', "reference" = $1, "note" = $2, "createdAt" = $3
   WHERE id = $4`,
  [utrNumber, finalReceiptPath, parsedDate, paymentId]
);
```

When a farmer uploads a payment receipt image for manual verification, the receipt file's URL path is stored in the `note` column of the `Payment` table. This is confirmed by `getPaymentDetails` (line 633):

```javascript
receiptFile: payment.note,  // ← Receipt is in 'note'
```

The `note` column is semantically intended for payment notes/comments. The `Payment` table does not have a dedicated `receiptFile` column. Storing binary file references in a text comment field creates:
1. **Schema confusion**: A developer reading the database schema sees `note` containing what looks like a URL path (`/uploads/receipt_PAY-123.jpg`) instead of a human-readable note.
2. **Data corruption risk**: If the cold storage admin adds a real note during payment review, it would overwrite the receipt URL.
3. **Query complexity**: Any query that needs both the note text AND the receipt path must work around this ambiguity.

---

## Finding 13 — `approveDispatch` Sends a Notification to `'default_vendor'` (Hardcoded Non-existent User)

**File**: [`dispatch.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/dispatch/dispatch.controller.js) Lines 227-236

```javascript
// dispatch.controller.js — Lines 227-236
await createAppNotification({
  coldStorageId: dispatchData.coldStorageId || 'cmmp9txv0000ai3t4wush9trs',
  userId: 'default_vendor',   // ← Hardcoded non-existent user
  lotId: null,
  type: 'info',
  title: 'Dispatch Approved by Farmer',
  message: `${farmerName} authorized dispatch of...`,
});
```

When a dispatch is approved, the system sends notifications to:
1. The farmer ✓
2. The cold storage ✓
3. **`'default_vendor'`** — a hardcoded string that is not a real user ID

The `ensureUserForFarmer('default_vendor')` call inside `createAppNotification` will try to create a shadow `User` record for `'default_vendor'` and will then attempt to send push notifications to this fake account. This generates:
- A garbage shadow user record in the database
- A failed push notification lookup
- A wasted database round-trip on every dispatch approval

Real vendor users never receive dispatch notifications because the notification is sent to a phantom account instead of being routed to actual vendors associated with that commodity or cold storage.

---

## Finding 14 — Government Mandi API Key Is Hardcoded in the Mobile Client Bundle

**File**: [`config.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/core/network/config.js) Lines 4-5

```javascript
// config.js — Lines 4-5
export const API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
export const API_KEY = '579b464db66ec23bdd0000011eca722018e9429560514de390d5bb1e';
```

The `data.gov.in` Mandi price API key is hardcoded directly in the mobile client-side bundle as a plain exported constant. This is the same class of exposure as the Weather API key (Finding 10 in the second report), but for the government commodity price API.

Combined with the existing Weather API key exposure, the mobile client now contains **three hardcoded API keys** in plaintext:
1. `WEATHER_API_KEY = 'cc98b5f11d594fa893f52703261806'` (WeatherAPI.com)
2. `API_KEY = '579b464db66ec23bdd0000011eca722018e9429560514de390d5bb1e'` (data.gov.in)
3. `supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'` (Supabase, in supabase.js)

All three keys are bundled into the compiled JavaScript assets. On Android, these are accessible via simple APK extraction with `apktool`. On both platforms, they appear in cleartext in any network request intercepted by a proxy tool.

---

## Finding 15 — `registerFarmer` Silently Defaults MPIN to `'1234'` If Not Provided

**File**: [`farmer.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/farmer/farmer.controller.js) Line 42

```javascript
// farmer.controller.js — Line 42
const hashedMpin = hashMpin(mpin || '1234');
```

When a cold storage operator registers a new farmer through the admin panel, if the `mpin` field is not included in the request body, the farmer account is created with MPIN `'1234'`. This is the system default, and the farmer is never informed of this.

The `loginMpin` function (line 122) also has an identical fallback:
```javascript
const farmerMpin = farmer.mpin || '1234'; // Fallback to cleartext '1234'
```

This means that if a farmer's MPIN is somehow null in the database, the system allows login with `1234` — but that verification happens on the plaintext string `'1234'`, not a hash of it. The `verifyMpin` function at line 11-16 has a special branch: if `storedHash.length !== 64` (i.e., it's not a proper SHA-256 hash), it does a **direct plaintext string comparison**: `return storedHash.toString() === mpin.toString()`. So any farmer stored with `mpin = '1234'` instead of the SHA-256 hash gets plaintext MPIN verification.

This means there are likely farmers in the database whose MPIN column contains `'1234'` in plaintext (stored directly, not hashed), and these accounts can be verified by literally comparing `'1234' === '1234'`. The `hashMpin` function would never store `'1234'` in plaintext — but the fallback `farmer.mpin || '1234'` returns the literal string if the DB value is null.

---

## Summary Table of All New Issues (Third Pass)

| # | File | Severity | Finding |
|---|---|---|---|
| 1 | `OtpScreen.js` | 🔴 Critical | OTP verification catches all errors and always passes — any 6-digit code authenticates any phone number |
| 2 | `farmer.controller.js` | 🔴 Critical | MPIN reset accepts hardcoded OTP `'1234'` — anyone can reset any account's MPIN |
| 3 | `user-role.service.js` | 🔴 Critical | Farmer role returned as `'ColdStorage'`; unregistered users also return `'ColdStorage'` |
| 4 | `dispatch.controller.js` | 🔴 Critical | Fallback B links dispatches to a completely random lot from any farmer — corrupts all inventory |
| 5 | `payment.controller.js` | 🔴 Critical | Developer's personal LAN IP (`192.168.200.24`) hardcoded as Razorpay callback URL — payments never confirmed in production |
| 6 | `payment.controller.js` | 🔴 Critical | Mock Razorpay credentials committed to source; missing env vars silently enable mock mode in production; webhook skips verification if env var absent |
| 7 | `payment.controller.js` | 🟠 High | `approvePayment` performs multi-step bill updates with no DB transaction — partial updates possible on failure |
| 8 | `dispatch.controller.js` | 🟠 High | `deliverDispatch` requires no authentication — anyone with a predictable dispatch ID can mark stock as delivered |
| 9 | `ProfileTab.js` | 🟡 Medium | All 7 profile menu items have no `onPress` — completely non-functional. KYC badge always shows "Verified" regardless of actual KYC status |
| 10 | `MandiTab.js` | 🟡 Medium | City dropdown only populated for 10 of 28 states — all other states show no city options |
| 11 | `payment.controller.js` | 🟡 Medium | Mock checkout page interpolates `orderId` directly into inline `<script>` — potential HTML/JS injection |
| 12 | `payment.controller.js` | 🟡 Medium | Receipt image URL stored in the `note` text field — semantic mismatch and corruption risk |
| 13 | `dispatch.controller.js` | 🟡 Medium | Dispatch approval notifies hardcoded `'default_vendor'` user — real vendors never receive dispatch alerts |
| 14 | `config.js` | 🟠 High | Government Mandi API key hardcoded in mobile bundle (alongside Weather API key and Supabase anon key — 3 secrets total in mobile bundle) |
| 15 | `farmer.controller.js` | 🟠 High | Default MPIN `'1234'` stored as plaintext fallback; plaintext-stored MPINs bypass SHA-256 comparison via `verifyMpin`'s length check |
