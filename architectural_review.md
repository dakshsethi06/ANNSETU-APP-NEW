# Exhaustive Architectural Review: AnnsetuNewApp
### Principal Engineer Analysis — Codebase Deep-Dive

> **Scope**: Full-stack audit covering the Expo/React Native mobile client (`/mobile`) and the Node.js/Express backend (`/backend`).
>
> **Files Analyzed**: `App.js`, `AppNavigator.js`, `HomeScreen.js`, `LoginScreen.js`, `useStorageTabDashboard.js`, `farmerService.js`, `config.js`, `supabase.js`, `api.js`, `server.js`, `database.js`, `config/index.js`, `farmer.controller.js`, `dispatch.controller.js`, `payment.controller.js`, `storage.controller.js`, `mandi.controller.js`, `cron.controller.js`, and all module route/service/repository files.

---

## Executive Summary

AnnsetuNewApp is a full-stack cold storage management application for the Indian agricultural market. The app has three distinct user roles (Farmer, Vendor, Cold Storage Facility), real-time data flow, payments via Razorpay, push notifications, and a modular folder structure.

**However, a deep technical audit reveals the following:**

- The modular structure is cosmetic. The dependency graph between modules violates every principle of true modularization.
- The mobile app has no real navigation system — role-switching doubles as routing, which is a fundamental design failure.
- Global state management doesn't exist; the root component acts as a makeshift state machine.
- Multiple **Critical Security Vulnerabilities** exist, including hardcoded API keys and secrets committed directly to source files, and a webhook handler that can be bypassed.
- The backend contains multiple instances of business logic being mixed into controllers, repository pattern violations, and no transactional integrity.
- The polling architecture for notifications is a textbook anti-pattern that will fail the moment the user base scales.
- The dual-database architecture (Supabase for auth + PostgreSQL for data) creates a split identity problem with no synchronization layer.

---

## Section 1: Architectural Flaws

### 1.1 — Mobile: Conditional Rendering Masquerading as Navigation

**Files**: [`AppNavigator.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/navigation/AppNavigator.js), [`App.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/App.js), [`HomeScreen.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/farmer/screens/HomeScreen.js)

The entire "navigation" system for the application root is a `switch(role)` statement in `AppNavigator.js`:

```javascript
// AppNavigator.js — Lines 21-55
const renderScreen = () => {
  switch (role) {
    case 'Farmer':    return <LoginScreen ... />;
    case 'Vendor':    return <VendorScreen ... />;
    case 'ColdStorage': return <HomeScreen ... />;
    case 'ColdStorageFacility': return <ColdStorageScreen ... />;
    default: return <LoginScreen ... />;
  }
};
```

This is not navigation. This is conditional rendering of full-screen components. The compounding problem is that the same anti-pattern exists *nested one level deeper* inside `HomeScreen.js`, where a second `activeTab` state string controls which child "screen" is rendered via inline conditionals:

```javascript
// HomeScreen.js — Lines 161-237
{activeTab === 'home' && <FarmerDashboard ... />}
{activeTab === 'notifications' && <NotificationsTab ... />}
{activeTab === 'stock' && <StockTab ... />}
{activeTab === 'market' && <MandiTab ... />}
{activeTab === 'khata' && <KhataTab ... />}
{activeTab === 'profile' && <ProfileTab ... />}
{activeTab === 'weather' && <WeatherTab ... />}
{activeTab === 'book' && <BookStorageTab ... />}
{activeTab === 'dispatch' && <DispatchTab ... />}
```

**Why this is fundamentally broken:**

1. **No navigation history.** React Native's Android back button is hardwired to its navigation stack. Since there is no stack, pressing the back button on any screen exits the app. There is no back stack to pop.
2. **No deep-linking.** If a push notification needs to open the user directly on the `DispatchTab`, it's impossible to do so without hacking around the entire role/tab state system.
3. **Full component tree destruction on every "tab switch".** Unlike React Navigation which preserves mounted screens, every conditional render here unmounts the previous component entirely and mounts a new one. This means all local state, scroll positions, form inputs, and data fetched inside those tabs is lost on every tab switch. The user scrolls down in their ledger, switches to home, and comes back to a reset state.
4. **Impossible to deep-nest routes.** If `KhataTab` needs to navigate to a `PaymentDetailScreen`, there is no mechanism to do it without creating another level of `activeSubTab` string state, compounding technical debt.
5. **The navigation logic is coupled to business logic.** The condition `role === 'ColdStorage'` mapping to the `HomeScreen` (which is actually the Farmer Dashboard) is confusing and bug-prone. The naming itself (`ColdStorage` role = Farmer screen) is an active maintenance hazard.

**The Correct Fix — React Navigation with typed stacks:**

```
NavigationContainer
  ├── AuthStack (shown when session === null)
  │   ├── LoginScreen
  │   ├── RegisterScreen
  │   └── OTPScreen
  │
  └── AppStack (shown when session !== null)
      ├── FarmerTabs (role === 'ColdStorage')
      │   ├── HomeTab
      │   ├── StockTab
      │   ├── MandiTab
      │   ├── KhataTab
      │   └── ProfileTab
      ├── VendorStack (role === 'Vendor')
      └── ColdStorageTabs (role === 'ColdStorageFacility')
```

Each feature owns its `Navigator.js`. The root only composes them. No screen logic leaks into the navigator itself.

---

### 1.2 — Mobile: God-Object Root Component (App.js)

**File**: [`App.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/App.js)

`App.js` is simultaneously responsible for:
- Managing the Supabase auth session (`session`, `loadingSession`)
- Determining and storing user role (`role`, `setRole`)
- Managing role-switcher UI visibility (`showRoleSwitcher`)
- Tracking keyboard state (`isKeyboardVisible`)
- Managing login-time preview bar suppression (`hidePreviewFromLogin`)
- Fetching fonts and managing font-loading state
- Running OTA update checks
- Registering for push notifications
- Wiring all these states into 9 separate props passed to `AppNavigator`

```javascript
// App.js — The 9-prop nightmare
<AppNavigator
  role={role}
  setRole={setRole}
  session={session}
  onLoginSuccess={handleLoginSuccess}
  setHidePreviewFromLogin={setHidePreviewFromLogin}
  setShowRoleSwitcher={setShowRoleSwitcher}
  showRoleSwitcher={showRoleSwitcher}
  isKeyboardVisible={isKeyboardVisible}
  hidePreviewFromLogin={hidePreviewFromLogin}
  onLogout={handleLogout}
/>
```

This is the classic **Props Drilling** anti-pattern. App.js has grown into a distributed global state manager using React's local `useState` as a substitute for a proper state management solution. As the app grows, every new screen that needs `role` or `session` must either receive it as a prop through every intermediate parent, or you create another 10-prop chain.

There is also a **React anti-pattern** in the `determineRole` function. It conditionally calls `determineRole` based on the current value of `role` in a `useEffect` that has both `session` and `role` as dependencies — meaning it could trigger re-entrantly:

```javascript
useEffect(() => {
  if (session && session.user && session.user.phone) {
    if (role === 'Farmer') {      // role is also a dependency — potential loop
      determineRole(session.user.phone);
    }
  } else {
    setRole('Farmer');            // This updates `role`, which re-fires the effect
  }
}, [session, role]); // <- both in deps array, mutual state updates
```

**The Fix — Zustand Global Store:**

```javascript
// store/useAuthStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create(
  persist(
    (set, get) => ({
      session: null,
      role: 'unauthenticated',
      setSession: (session) => set({ session }),
      setRole: (role) => set({ role }),
      logout: () => set({ session: null, role: 'unauthenticated' }),
    }),
    { name: 'auth-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

`App.js` is then reduced to a navigation container and font-loader. Every component reads from the store directly. No props needed.

---

### 1.3 — Mobile: Role Naming and Logic Inversion Bug

**File**: [`App.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/App.js) Lines 152-168, [`AppNavigator.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/navigation/AppNavigator.js) Lines 37-44

This is an active, latent bug in production:

```javascript
// App.js — handleLoginSuccess function
if (registrationRole === 'coldstorage') {
  setRole('ColdStorageFacility');
} else if (registrationRole === 'vendor') {
  setRole('Vendor');
} else if (registrationRole === 'farmer') {
  setRole('ColdStorage');    // ← A farmer gets the role 'ColdStorage'?!
} else {
  determineRole('+91' + phone);
}
```

The `'ColdStorage'` role name maps to the **Farmer Dashboard** (`HomeScreen`), not to the Cold Storage facility screen. The actual Cold Storage Facility maps to `'ColdStorageFacility'`. This inversion means the string `'ColdStorage'` is a misnomer throughout the entire codebase — every developer who reads this code without full context will be confused. This is a naming anti-pattern that is a direct maintenance hazard. The role strings should be named `'FARMER'`, `'VENDOR'`, `'COLD_STORAGE_FACILITY'` using a typed enum or constants file.

---

### 1.4 — Mobile: The Fake Modular Architecture (Core Depends on Features)

**File**: [`src/core/network/api.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/core/network/api.js)

The article you referenced describes true modularity: **features should be self-contained and depend on core. Core should never depend on features.** This codebase violates this in a spectacular way:

```javascript
// src/core/network/api.js — The coupling bomb
export * from './config';
export * from '../../features/mandi/services/mandiService';
export * from '../../features/weather/services/weatherService';
export * from '../../features/farmer/services/farmerService';
export * from '../../features/cold-storage/services/storageService';
export * from '../../features/mandi/services/amadService';
export * from '../../features/notifications/services/notificationService';
export * from '../../features/farmer/services/locationService';
```

The `core` network layer is a barrel-file that re-exports everything from every feature. This creates a hard, circular dependency direction: `core → features`. If you delete `features/weather`, your entire `core/network/api.js` throws a `Cannot find module` error, crashing the entire app.

Furthermore, the `useStorageTabDashboard` hook — which lives in the `farmer` feature — imports from `core/network/api.js`:

```javascript
// useStorageTabDashboard.js — Line 2
import { fetchFarmers, fetchFarmerLedger, fetchWeather } from '../../../core/network/api';
```

And `core/network/api.js` in turn re-exports those same `farmerService` functions. So the `farmer` feature imports from `core`, which imports back from the `farmer` feature. This is a **circular module dependency** waiting to cause runtime issues or bundler confusion.

**The True Modular Pattern (Dependency Rule):**

```
features/farmer/
  api/         ← farmer owns its API calls
    index.js
  components/
  screens/
  hooks/
  index.js     ← exports its NavigationStack + Zustand slice

core/
  network/
    client.js  ← only the Axios instance setup / interceptors
  theme/
  components/  ← shared atoms (Button, Card, etc.)
```

`core` never imports from `features`. `features` import from `core`. This is the Dependency Inversion Principle applied to a React Native monorepo.

---

### 1.5 — Backend: All Routes Share the Same `/api` Prefix

**File**: [`backend/server.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/server.js)

```javascript
app.use('/api', require('./modules/mandi'));
app.use('/api', require('./modules/farmer'));
app.use('/api', require('./modules/amad'));
app.use('/api', require('./modules/storage'));
app.use('/api', require('./modules/notification'));
app.use('/api', require('./modules/cron'));
app.use('/api', require('./modules/dispatch'));
app.use('/api', require('./modules/payment'));
app.use('/api', require('./modules/user-role'));
```

Every module is mounted to the root `/api` path. Route collision is entirely possible if any two modules define the same path suffix (e.g., both `farmer` and `storage` could define `/api/list`). A proper RESTful structure would scope by resource: `/api/farmers`, `/api/storage`, `/api/payments`. The current structure also makes it impossible to apply module-specific middleware (e.g., rate limiting only the payment module) without rearchitecting all the routes.

**The Fix:**

```javascript
app.use('/api/v1/mandi',    require('./modules/mandi'));
app.use('/api/v1/farmers',  require('./modules/farmer'));
app.use('/api/v1/storage',  require('./modules/storage'));
app.use('/api/v1/payments', require('./modules/payment'));
// etc.
```

This also future-proofs the API for versioning (`v1`, `v2`).

---

### 1.6 — Backend: No Global Error Handling Middleware

**File**: [`backend/server.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/server.js)

Express 4 requires a 4-parameter middleware for centralized error handling. This doesn't exist. Every controller manually catches errors with `try/catch` and returns `res.status(500)`. Any unhandled rejection — such as from the Razorpay client initialization, a mis-handled async callback, or a third-party library that throws synchronously — will result in either:
1. A process crash (unhandled promise rejection in Node 15+).
2. A request that hangs with no response sent (request timeout for the client).

There is also no `process.on('unhandledRejection')` or `process.on('uncaughtException')` handler to allow for graceful shutdown.

**The Fix:**

```javascript
// At the very end of server.js, after all routes
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
  console.error(`[Global Error Handler] ${req.method} ${req.url}: ${err.message}`, err.stack);
  res.status(statusCode).json({ success: false, error: message });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally trigger graceful shutdown
});
```

---

### 1.7 — Backend: Business Logic Bleeding into Controllers

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 643-722

The `approvePayment` function in the payment controller executes a multi-step financial reconciliation operation: it fetches the payment, updates the payment status, then iterates over all outstanding `NikasiTransaction` bills oldest-first and applies the payment against them. This is core **financial ledger business logic** sitting inside an HTTP controller function.

This violates the Single Responsibility Principle. The controller's job is to parse the HTTP request and delegate to a service. Instead it is running a financial calculation loop directly in the request handler.

If the ledger update loop fails midway (e.g., DB connection drop after updating 3 of 7 bills), you now have **partial financial data** with no transaction rollback. The payment was marked as `APPROVED` but only some bills were cleared. This is a data corruption scenario with real financial consequences.

**The Fix — Transactions + Service Layer:**

```javascript
// payment.service.js
async function approvePayment(paymentId) {
  const client = await db.connect(); // Get a dedicated client for transaction
  try {
    await client.query('BEGIN');
    
    const payment = await client.query('SELECT * FROM "Payment" WHERE id = $1 FOR UPDATE', [paymentId]);
    // ...
    await client.query('UPDATE "Payment" SET status = $1 WHERE id = $2', ['APPROVED', paymentId]);
    
    for (const bill of outstandingBills) {
      await client.query('UPDATE "NikasiTransaction" SET ...', [...]);
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

Without `BEGIN/COMMIT/ROLLBACK`, any multi-step database mutation is guaranteed to corrupt data under network failure or server crash conditions.

---

### 1.8 — Backend: Duplicate Business Logic Across Controllers

**Files**: [`farmer.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/farmer/farmer.controller.js) Lines 4-18, [`dispatch.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/dispatch/dispatch.controller.js) Lines 4-16

The `hashMpin` and `verifyMpin` functions are copy-pasted identically into at least two different controller files:

```javascript
// farmer.controller.js — Lines 6-18
function hashMpin(mpin) {
  if (!mpin) return '';
  return crypto.createHash('sha256').update(mpin.toString()).digest('hex');
}

function verifyMpin(mpin, storedHash) {
  if (!storedHash) return false;
  // ...
}

// dispatch.controller.js — Lines 4-16
function hashMpin(mpin) { // EXACT SAME CODE
  if (!mpin) return '';
  return crypto.createHash('sha256').update(mpin.toString()).digest('hex');
}
```

This is a **DRY (Don't Repeat Yourself) violation**. If the hashing algorithm ever needs to change (e.g., migrating from SHA-256 to bcrypt), a developer must remember to find and update every copy. If they miss one, the app has an invisible divergence in security behavior. This code belongs in `shared/auth/mpin.js` and imported where needed.

---

## Section 2: Scalability & Performance

### 2.1 — Mobile: Polling Notifications Every 5 Seconds

**File**: [`HomeScreen.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/farmer/screens/HomeScreen.js) Lines 66-80

```javascript
useEffect(() => {
  if (!selectedFarmerId) return;

  const interval = setInterval(async () => {
    try {
      const { fetchNotifications } = require('../../notifications/services/notificationService');
      const list = await fetchNotifications(selectedFarmerId);
      setNotificationsList(list || []);
    } catch (err) {
      console.warn('HomeScreen background notification poll failed:', err.message);
    }
  }, 5000); // every 5 seconds

  return () => clearInterval(interval);
}, [selectedFarmerId]);
```

This is a textbook polling anti-pattern. Every 5 seconds, for every active Farmer user, the app makes a full HTTP request to the backend which in turn fires a `SELECT` query against the PostgreSQL database. At scale:
- **100 active farmers** = 100 requests/5 seconds = **1,200 req/min** to the notifications endpoint alone.
- **1,000 active farmers** = **12,000 req/min**, all of which trigger DB queries on the `AppNotification` table.

This will saturate the PostgreSQL connection pool and overload the backend under moderate load. It also drains the user's battery and mobile data.

Additionally, note the dynamic `require()` inside `setInterval` callback — this re-resolves the module on every interval tick.

**The Fix — Supabase Realtime:**

Since the project already uses Supabase, the `AppNotification` table should use Supabase's built-in Realtime subscriptions:

```javascript
// useNotifications.js
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'AppNotification',
      filter: `userId=eq.${farmerId}`,
    }, (payload) => {
      setNotificationsList(prev => [payload.new, ...prev]);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [farmerId]);
```

Zero polling, true real-time, zero database load from client-side timers.

---

### 2.2 — Backend: No Caching Layer for the Mandi Price API

**File**: [`mandi.service.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/mandi/mandi.service.js)

The backend fetches mandi prices from the external `api.data.gov.in` government API on every single request. This data changes at most once per day (it's a daily published price dataset). Every time any farmer checks mandi rates, a full outbound HTTP request is made to an external government API. Problems:
1. **Latency**: The `data.gov.in` API is notoriously slow. Each request adds hundreds of milliseconds to the user response time.
2. **Rate Limiting**: The API has usage quotas. Under concurrent user load, you will hit rate limits and all farmers will see errors simultaneously.
3. **External Dependency Failure**: If `api.data.gov.in` goes down, the mandi feature becomes completely unavailable.

**The Fix — Redis TTL Cache:**

```javascript
// mandi.service.js with Redis caching
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
const CACHE_TTL = 3600; // 1 hour

async function fetchMandiPrices(apiKey, state, commodity, market) {
  const cacheKey = `mandi:${state}:${commodity}:${market}`;
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const freshData = await fetchFromGovApi(apiKey, state, commodity, market);
  await client.setEx(cacheKey, CACHE_TTL, JSON.stringify(freshData));
  return freshData;
}
```

One external API call per hour maximum, served from memory to all users.

---

### 2.3 — Backend: Unbounded PostgreSQL Connection Pool

**File**: [`backend/config/database.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/config/database.js)

```javascript
pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false }
});
```

The `Pool` is created with no configuration for:
- `max`: Maximum number of connections (defaults to 10 — will deadlock under concurrent load)
- `idleTimeoutMillis`: How long idle connections are kept (defaults to 10,000ms)
- `connectionTimeoutMillis`: How long to wait when the pool is full (defaults to 0 — throws immediately)

Under a spike of 50 concurrent requests (very achievable during market hours when all farmers check mandi rates simultaneously), the pool's 10 connections will be exhausted. New requests will receive a connection pool error rather than queuing gracefully.

**The Fix:**

```javascript
pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 20,                      // tuned for your Supabase plan limits
  idleTimeoutMillis: 30000,     // release idle connections after 30s
  connectionTimeoutMillis: 5000 // wait 5s for a connection before throwing
});

// Add pool error handler to prevent crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});
```

---

### 2.4 — Mobile: N+1 Data Loading Pattern in handleSelectFarmer

**File**: [`useStorageTabDashboard.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/farmer/hooks/useStorageTabDashboard.js) Lines 80-140

`loadDbFarmers()` is called first. If a `loggedInPhone` is present, it then immediately calls `handleSelectFarmer(found.serial_number)`, which calls `fetchFarmers()` a **second time** with the specific ID. This means every time the screen loads, there are **two sequential network requests** to the farmers endpoint, and the second one fetches a subset of what the first already returned. This is a classic N+1 pattern where one fetch triggers another.

Furthermore, inside `handleSelectFarmer`, four parallel API calls are made:
```javascript
const [holdings, notifications, ledger, weather] = await Promise.all([...]);
```

While the `Promise.all` is good, `fetchHoldings()` fetches ALL holdings from the DB with no `farmerId` filter, and then filters client-side:
```javascript
setHoldingsList(holdings.filter((h) => h.id === farmerId) || []);
```

This is a **client-side filter on a full table scan**. At scale, this endpoint transfers the entire holdings table to the mobile client on every dashboard load, filtering afterwards in JavaScript.

---

### 2.5 — Backend: Global 15MB JSON Payload Limit is a DoS Vector

**File**: [`backend/server.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/server.js) Lines 11-12

```javascript
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
```

This applies a 15MB limit globally to every route including health checks and simple GET endpoints. A simple shell script can exhaust all available Node.js heap memory:

```bash
# Trivial DoS attack
for i in {1..50}; do
  curl -X POST http://your-server/api/farmers \
    -H 'Content-Type: application/json' \
    -d "$(python3 -c 'print("{\"data\": \"" + "A"*14999999 + "\"}')" &
done
```

50 concurrent 15MB requests = 750MB of memory allocated simultaneously in a single-threaded Node.js process. This crashes any standard cloud instance.

**The Fix:** The only routes that need large payloads are the payment receipt upload routes. All others should use a 100KB limit. Use `multer` for file uploads with streaming to disk instead of loading into memory.

```javascript
// server.js — scoped limits
app.use(express.json({ limit: '100kb' })); // global default
// Override only where needed, in the specific route:
app.use('/api/payments/verify', express.json({ limit: '2mb' }));
```

---

## Section 3: Security & Best Practices

### 3.1 — CRITICAL: API Keys and Secrets Hardcoded in Source Files

**File**: [`mobile/src/core/network/config.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/core/network/config.js)

```javascript
// config.js — Lines 5-9 — HARDCODED SECRETS
export const API_KEY = '579b464db66ec23bdd0000011eca722018e9429560514de390d5bb1e';
export const WEATHER_API_KEY = 'cc98b5f11d594fa893f52703261806';
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.200.24:3001';
```

**File**: [`mobile/src/core/network/supabase.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/core/network/supabase.js)

```javascript
// supabase.js — Lines 5-6 — SUPABASE ANON KEY COMMITTED TO GIT
const supabaseUrl = 'https://tbrvuyzjzruysxamiuaz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicnZ1eXpqenJ1eXN4YW1pdWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODczNTAsImV4cCI6MjA5Nzk2MzM1MH0.vs9F0doRCPhI6rPGfURJYak05FbFMhZ1jhmN64m7NXY';
```

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 10-11

```javascript
const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_DakshSethi123';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_daksh_sethi';
```

> [!CAUTION]
> These are real credentials or keys that are committed to a git repository. Any person with repository access (or if the repo is public, any person on the internet) can use the Supabase anon key to interact directly with your database, the `data.gov.in` API key to exhaust your quota, and the WeatherAPI key to rack up charges. The Razorpay test key ID with a developer's full name embedded is also a sign of poor key hygiene.

Every secret must be moved to `.env` files that are listed in `.gitignore`. For mobile apps built with Expo, secrets that are truly secret must be kept server-side or in Expo's EAS Secrets, not in the bundle.

**The Fix:**

```javascript
// supabase.js
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
```

The `.env.example` should contain placeholder variable names only, never real values.

---

### 3.2 — CRITICAL: MPIN Reset OTP is Hardcoded as "1234"

**File**: [`LoginScreen.js`](file:///c:/Users/tejas/AnnsetuNewApp/mobile/src/features/auth/screens/LoginScreen.js) Lines 37-39, [`farmer.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/farmer/farmer.controller.js) Lines 147-150

```javascript
// LoginScreen.js — Client-side validation of OTP
if (resetOtp !== '1234') {
  Alert.alert('Error', 'Invalid verification OTP. Please use "1234" to verify.');
  return;
}

// farmer.controller.js — Server-side "verification"
if (otp !== '1234') {
  return res.status(400).json({ success: false, error: 'Invalid verification OTP.' });
}
```

The MPIN reset "OTP" is the hardcoded number `1234`. This is not an OTP. Any person who knows a farmer's phone number can go to the "Forgot MPIN" screen, type `1234`, and reset that farmer's MPIN to anything they choose — instantly gaining full access to the farmer's financial account, ledger, and dispatch authorization capability.

This is a **complete bypass of authentication** for the MPIN reset flow. There is no actual OTP being sent to the user's phone. The UI shows a helpful placeholder saying "Enter 1234 to verify", making it trivial to discover.

**The Fix:**
1. Integrate Supabase's `signInWithOtp` (which is already partially implemented in the codebase for the main login flow) and use it to send a real SMS OTP to the farmer's phone before allowing the MPIN reset.
2. Enforce an expiry on the OTP (5 minutes).
3. Rate-limit the reset endpoint to prevent brute force.

---

### 3.3 — CRITICAL: Razorpay Webhook Can Be Bypassed

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 341-354

```javascript
async function handleWebhook(req, res) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_daksh_sethi';
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  const skipVerify = webhookSecret === 'webhook_secret_daksh_sethi'; // ← the bypass
  if (!skipVerify && expectedSignature !== signatureHeader) {
    return res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
  }
  
  // Proceeds to mark payment as PAID...
}
```

When `RAZORPAY_WEBHOOK_SECRET` is not set in the environment (which happens in any deployment that didn't carefully configure this), the `webhookSecret` defaults to the hardcoded string `'webhook_secret_daksh_sethi'`, and then `skipVerify` becomes `true`. This means **any HTTP POST to the webhook endpoint**, with any body, will be processed as a legitimate payment confirmation.

An attacker can fabricate a `payment.captured` event and POST it to your webhook URL to mark any order as PAID without paying a single rupee.

---

### 3.4 — HIGH: Insecure SSL Configuration for PostgreSQL

**File**: [`backend/config/database.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/config/database.js) Lines 13-16

```javascript
pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: false  // ← Disables SSL certificate verification
  }
});
```

`rejectUnauthorized: false` tells Node.js to accept *any* SSL certificate, including self-signed, expired, or malicious certificates. This completely voids the security guarantees of SSL. If an attacker performs a Man-in-the-Middle attack between your backend server and Supabase's PostgreSQL, they can intercept all database traffic — farmer financial records, MPIN hashes, payment data — in plaintext.

This setting exists as a convenience for developers who haven't configured SSL certificates. It must never reach production.

---

### 3.5 — HIGH: Unrestricted CORS

**File**: [`backend/server.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/server.js) Line 10

```javascript
app.use(cors());
```

This enables CORS for all origins, all methods, all headers. Any website in the world can make cross-origin requests to this API from a user's browser. If a user is logged in via their browser (e.g., if a web dashboard is added later) and visits a malicious website, that site can make authenticated requests to your API using the user's session cookies.

**The Fix:**

```javascript
app.use(cors({
  origin: [
    'https://annsetu.app',
    'https://admin.annsetu.app',
    process.env.NODE_ENV === 'development' && 'http://localhost:8081'
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

---

### 3.6 — HIGH: No Authentication/Authorization on Any API Endpoint

**File**: All backend route files

Not a single business endpoint in the backend requires an authenticated request. Any anonymous user can call `GET /api/farmers` to retrieve the entire farmer list, `GET /api/farmers/:id/ledger` to read any farmer's full financial ledger, or `POST /api/dispatch` to create a fake dispatch record.

The MPIN login returns a role indicator but no session token is issued, no JWT is created, and no middleware verifies the caller's identity on subsequent requests. The `cron.controller.js` has token-based auth as an example, but it's the only one and it uses a weak shared secret.

**The Fix:**
1. Issue a signed JWT on successful MPIN login.
2. Create an `authMiddleware.js` that verifies the JWT on every protected route.
3. Implement route-level RBAC (Role-Based Access Control): only a Farmer can approve their own dispatch; only a Cold Storage can approve payments.

---

### 3.7 — MEDIUM: File Upload via Base64 String in JSON Body

**File**: [`payment.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/payment/payment.controller.js) Lines 159-194

When a farmer uploads a payment receipt, the image is sent as a base64-encoded string inside a JSON request body:

```javascript
if (receiptFile && receiptFile.startsWith('data:')) {
  const matches = receiptFile.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  // Converts the base64 back to a buffer
  const buffer = Buffer.from(base64Data, 'base64');
  // Writes it to local disk
  fs.writeFileSync(filePath, buffer);
}
```

This has multiple problems:
1. A 2MB image becomes a ~2.67MB base64 string, increasing the payload size by 33%.
2. The file is loaded entirely into Node.js heap memory before being written to disk.
3. Files are written to the local filesystem (`uploads/`). In any cloud deployment (Kubernetes, Heroku, Render), the filesystem is ephemeral — the file disappears on every deployment or restart.
4. There is no file type validation beyond checking if the MIME type string contains "jpeg". A malicious actor can send `data:image/jpeg;base64,<base64-encoded-malware>` with no restriction.

**The Fix:** Use `multer` + `multer-storage-cloudinary` (or S3). Stream the file directly from the request to cloud storage. Return a permanent URL. Never touch the local filesystem.

---

### 3.8 — MEDIUM: Dispatch Fallback Creates Data Integrity Violations

**File**: [`dispatch.controller.js`](file:///c:/Users/tejas/AnnsetuNewApp/backend/modules/dispatch/dispatch.controller.js) Lines 100-115

```javascript
// Fallback B: Any lot in the database to satisfy NOT NULL constraint
lotRes = await db.query(`SELECT id FROM "AmadLot" LIMIT 1`);
if (lotRes.rows.length > 0) {
  lotId = lotRes.rows[0].id;
}
```

When a dispatch is created for a farmer who doesn't have any matching stock lot, the code falls back to assigning a completely **random lot from the database** that belongs to a different farmer. This creates a `NikasiTransaction` record linking Farmer A's dispatch to Farmer B's lot — a financial data integrity violation that would be impossible to audit or reconcile.

---

## Section 4: Authentication Architecture — The Split Identity Problem

The app uses **two separate database systems for authentication**:
1. **Supabase Auth** (PostgreSQL-backed, phone OTP) — used for the vendor/cold-storage OTP login flow.
2. **Custom MPIN system** (direct PostgreSQL queries) — used for the farmer login flow.

This creates a split identity problem:
- A farmer registered via MPIN has no Supabase `auth.users` record.
- A cold storage registered via OTP has no guaranteed entry in the `ColdStorageOnboarding` PostgreSQL table.
- `App.js` maintains its own `session` state that is a mix of Supabase sessions and synthetic session objects:

```javascript
// handleLoginSuccess — Line 152-157 in App.js
const handleLoginSuccess = (phone, registrationRole) => {
  setSession({             // ← This is NOT a real Supabase session object
    user: {
      phone: '+91' + phone,
    }
  });
```

The session object created for MPIN logins is a manually constructed JavaScript object, not a real Supabase `Session`. Code that checks `session.user.phone` works because it's duck-typed, but code that calls `supabase.auth.getUser()` or `session.access_token` will fail silently for MPIN-authenticated users.

**The Fix:** Choose one authentication system. Since Supabase is already in the project, extend it. Use Supabase's custom OTP flow for all roles. Store role information in the Supabase `profiles` table. This gives a single source of truth for auth state.

---

## Section 5: Modular Architecture Assessment

### Benchmark: The Referenced Article's Modular Principles

The article defines a properly modular React Native architecture as one where:
1. **Each feature is an isolated, self-contained unit** with its own screens, state, and API calls.
2. **Features communicate through shared interfaces** (stores, context, navigation events), not direct imports.
3. **The core never depends on features** — only the reverse.
4. **Features can be added or removed** without breaking others.

### AnnsetuNewApp Verdict: ❌ Cosmetically Modular, Architecturally Coupled

| Criterion | Status | Evidence |
|---|---|---|
| Features have isolated screens | ✅ Partial | Each feature has its own `screens/` folder |
| Features have isolated services | ✅ Partial | Each feature has `services/` |
| Core does not depend on features | ❌ **FAIL** | `core/network/api.js` re-exports all feature services |
| Features communicate via stores | ❌ **FAIL** | Props drilling through `App.js` → `AppNavigator` |
| Features can be independently removed | ❌ **FAIL** | Deleting any feature breaks `core/network/api.js` |
| Navigation is owned by features | ❌ **FAIL** | `AppNavigator` hard-imports all feature screens |
| No circular dependencies | ❌ **FAIL** | `farmer feature` → `core/api` → `farmer feature services` |
| Shared business logic is in `shared/` | ❌ **FAIL** | `hashMpin` copy-pasted in 2+ controllers |

**Score: 2/8 criteria met.** The folder structure follows the *appearance* of modularity but the dependency wiring destroys the benefits.

### What True Modular Architecture Would Look Like Here

```
mobile/src/
├── core/                         # ← Core owns infrastructure only
│   ├── network/
│   │   └── client.js             # Axios/Fetch instance, base URL, interceptors ONLY
│   ├── theme/
│   ├── components/               # Shared, dumb UI atoms: Button, Card, Avatar
│   └── store/
│       └── useAppStore.js        # Global: toast, network status
│
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   ├── api/                  # Auth feature owns its own API calls
│   │   │   └── authApi.js
│   │   ├── store/
│   │   │   └── useAuthStore.js   # Session, role — owned by auth feature
│   │   └── AuthNavigator.js      # Exports its own navigator
│   │
│   ├── farmer/
│   │   ├── screens/
│   │   ├── api/
│   │   │   └── farmerApi.js      # Farmer feature owns its API calls
│   │   ├── store/
│   │   │   └── useFarmerStore.js
│   │   └── FarmerNavigator.js    # Tab navigator exported by feature
│   │
│   ├── mandi/
│   │   ├── screens/
│   │   ├── api/
│   │   │   └── mandiApi.js
│   │   └── MandiNavigator.js
│   │
│   └── notifications/
│       ├── hooks/
│       │   └── useNotifications.js  # Supabase realtime subscription
│       └── api/
│
└── navigation/
    └── RootNavigator.js          # Only composes feature navigators
        # Reads role from useAuthStore()
        # Never imports feature screens directly
```

With this structure:
- `core/network/client.js` exports only an Axios instance. It has zero imports from features.
- Deleting `features/mandi` only requires removing its entry from `RootNavigator.js`. Nothing in `core` breaks.
- The `useAuthStore` from the `auth` feature is the single source of truth. `RootNavigator` reads `role` from it to decide which feature navigator to show.
- Every feature's API calls live inside that feature. No barrel re-exporting.

---

## Section 6: Technical Debt Summary Table

| # | Location | Severity | Issue | Fix |
|---|---|---|---|---|
| 1 | `App.js` + `AppNavigator.js` | 🔴 Critical | No real navigation system; switch/conditional rendering | Implement React Navigation with typed stacks |
| 2 | `App.js` | 🔴 Critical | Role naming inversion (`ColdStorage` = Farmer dashboard) | Rename role constants using an enum/constants file |
| 3 | `config.js`, `supabase.js` | 🔴 Critical | Real API keys, Supabase anon key hardcoded in git | Move all secrets to `.env` + EAS Secrets |
| 4 | `farmer.controller.js` | 🔴 Critical | MPIN reset OTP is hardcoded `"1234"` — auth bypass | Implement real SMS OTP via Supabase or Twilio |
| 5 | `payment.controller.js` | 🔴 Critical | Razorpay webhook skips verification when env var unset | Always verify; never default to skip |
| 6 | `core/network/api.js` | 🔴 Critical | Core module depends on all feature modules — circular deps | Invert: features own their own API calls |
| 7 | `HomeScreen.js` | 🟠 High | 5-second polling for notifications | Replace with Supabase Realtime subscriptions |
| 8 | `server.js` | 🟠 High | No global error handler; no process crash guard | Add 4-param Express error middleware |
| 9 | `server.js` | 🟠 High | `cors()` with no origin restrictions | Whitelist specific production origins |
| 10 | `database.js` | 🟠 High | `rejectUnauthorized: false` — no SSL cert verification | Use proper CA cert bundle for Supabase SSL |
| 11 | `payment.controller.js` | 🟠 High | Multi-step financial write with no DB transaction | Wrap all multi-step writes in `BEGIN/COMMIT/ROLLBACK` |
| 12 | All backend routes | 🟠 High | Zero authentication on any API endpoint | Implement JWT middleware, RBAC per endpoint |
| 13 | `server.js` | 🟠 High | 15MB global JSON limit — trivial DoS attack | Reduce to 100KB global; scope larger limits to specific routes |
| 14 | `App.js` | 🟡 Medium | 9-prop drilling through AppNavigator | Migrate to Zustand global store |
| 15 | `dispatch.controller.js` | 🟡 Medium | Fallback assigns random lot from another farmer's data | Reject with 400 if no matching lot found |
| 16 | `payment.controller.js` | 🟡 Medium | Receipt file uploaded as base64 in JSON body, stored on ephemeral local disk | Use `multer` + cloud storage (S3/Cloudinary) |
| 17 | `farmer.controller.js`, `dispatch.controller.js` | 🟡 Medium | `hashMpin`/`verifyMpin` copy-pasted across controllers | Extract to `shared/auth/mpin.js` |
| 18 | `mandi.service.js` | 🟡 Medium | No caching on external government API — rate limit risk | Implement Redis/in-memory TTL cache |
| 19 | All backend modules | 🟡 Medium | All modules mount to `/api` — collision risk, no versioning | Scope routes as `/api/v1/resource-name` |
| 20 | `database.js` | 🟢 Low | Pool created with no `max`, `idleTimeout`, `connectionTimeout` | Configure pool with explicit limits |
| 21 | `App.js` | 🟢 Low | `useEffect` with `[session, role]` deps causes potential re-entrancy | Refactor with Zustand; eliminate the effect |
| 22 | `useStorageTabDashboard.js` | 🟢 Low | Double fetch of farmers list on init; client-side filter on full table scan | Add `farmerId` filter parameter to backend API |

---

## Section 7: Priority Roadmap

### Phase 1 — Security Hardening (Do this immediately, before next deployment)
1. **Rotate all exposed secrets** immediately: Supabase anon key, Weather API key, data.gov.in API key, Razorpay keys.
2. **Fix the MPIN reset flow** — delete the `otp !== '1234'` check entirely. Replace with real Supabase OTP.
3. **Fix the webhook bypass** — remove the `skipVerify` conditional.
4. **Fix the SSL config** — remove `rejectUnauthorized: false`.

### Phase 2 — Core Architecture Refactor
1. Install and configure **React Navigation v6**.
2. Migrate global state to **Zustand** (`useAuthStore`, `useAppStore`).
3. Rename role constants. Create a `constants/roles.js` file.
4. Add a **global Express error handler**.
5. Implement **JWT-based authentication** middleware on all protected routes.

### Phase 3 — Performance & Scalability
1. Replace polling with **Supabase Realtime** subscriptions.
2. Add **Redis caching** for the Mandi API.
3. Wrap all multi-step DB mutations in **transactions**.
4. Fix the CORS configuration.
5. Scope the JSON body-size limit.

### Phase 4 — True Modularization
1. Refactor `core/network/api.js` — remove all feature re-exports.
2. Move each feature's API calls into that feature's `api/` directory.
3. Each feature exports its own Navigator.
4. `RootNavigator` only composes feature navigators.
