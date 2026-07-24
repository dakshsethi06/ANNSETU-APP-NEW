# 🌾 Annsetu
### Connecting Farmers, Cold Storage Facilities, and Vendors with IoT Integration

**Annsetu** is a comprehensive agricultural technology platform designed to bridge communication, logistics, and transactional gaps between farmers, cold storage facility operators, and vendors. It integrates real-time Mandi market prices, secure payments, inventory tracking, push notification services, and MQTT-driven IoT telemetry with firmware OTA update support.

---

## 🚀 Key Features

* **🌾 Farmer Portal:**
  * **Real-time Mandi Prices:** Direct synchronization with the Government of India's Open Data Portal (`data.gov.in`) to view current commodity rates.
  * **Digital Ledger & Dues Capping:** Tracks transactions, deposits, and outstanding bills. Razorpay checkout cap ensures farmers can never pay more than their outstanding dues.
  * **Crop Holdings & Inward Bookings:** Live checks on crop holdings, deposit room allocations, and inward stock lots (`AmadLot`).
  * **Weather Forecasts:** Instant, localized weather reports to help with planning.
  * **Support Desk:** Raise, track, and resolve support queries directly from the application.

* **🏪 Cold Storage Management:**
  * **Stock Management:** Track active stock lots and holdings per farmer.
  * **Ledger Synchronization:** Standardized ledger calculations where outstanding receivables are tracked consistently across both customer and facility dashboards.
  * **Outward Dispatches:** Direct booking validation of stock lots, preventing dispatch requests for accounts lacking active stock bookings.

* **📡 IoT Integration & Simulator (ESP32 QEMU):**
  * **Real-time Telemetry:** Hardware reports sensor data (temperature, chamber status, connectivity metrics) over MQTT to the backend.
  * **Device Watchdog:** Active backend monitor that continuously checks device heartbeats and flags alerts for offline statuses.
  * **OTA (Over-the-Air) Updates:** Admin panel allows firmware updates to be compiled and pushed over MQTT directly to the virtual ESP32.

---

## 🛠️ Tech Stack & Architecture

### **Mobile App (Client)**
* **Framework:** React Native (Expo SDK 54)
* **State Management:** Zustand (centralized session, roles, and auth states)
* **Navigation:** React Navigation (Nested Stack and BottomTab structure)
* **Typography:** Noto Sans, Noto Sans Devanagari, and DM Mono Google Fonts

### **Backend Server**
* **Runtime:** Node.js (Express)
* **Database:** PostgreSQL (hosted on Supabase) utilizing dynamic connection pooling
* **Communication Brokers:** Built-in Aedes MQTT broker for telemetry logging and device commands
* **Testing Framework:** Jest automated test suite for ledger entries, Razorpay caps, and stock weight conversions

### **IoT Simulator (Firmware)**
* **Language:** C++
* **SDK:** Espressif ESP-IDF
* **Virtualization:** QEMU emulator (`qemu-system-xtensa`)

---

## 📁 Project Directory

```text
ANNSETU-APP-NEW/
├── backend/                   # Node.js Express API & MQTT Server
│   ├── config/                # Database and constants configuration
│   ├── modules/               # Modularized feature folders
│   │   ├── alerts/            # Watchdog CRON monitors
│   │   ├── amad/              # Stock lot management
│   │   ├── commands/          # MQTT device commands dispatcher
│   │   ├── device-management/ # IoT device registration and status
│   │   ├── dispatch/          # Dispatch tracking & MPIN check
│   │   ├── farmer/            # Farmer profiles and ledgers
│   │   ├── kyc/               # KYC verification endpoints
│   │   ├── mandi/             # eNAM Mandi price integration
│   │   ├── notification/      # Push notifications and shadow user sync
│   │   ├── ota/               # Firmware OTA update controllers
│   │   ├── payment/           # Razorpay online & manual receipt payments
│   │   ├── telemetry/         # MQTT Broker setup and logging
│   │   └── ...                # User roles, support, weather
│   ├── shared/                # Shared middleware and utilities
│   ├── tests/                 # Jest unit/E2E testing suite
│   ├── server.js              # Server entry point and routing config
│   └── migrate-db.js          # DB schema migration runner
│
├── mobile/                    # React Native Expo Mobile Client
│   ├── src/
│   │   ├── core/              # Network config, Supabase clients
│   │   ├── features/          # Feature UI modules (Auth, Mandi, Weather, Ledger, KYC)
│   │   └── navigation/        # App navigation routes (React Navigation)
│   ├── App.js                 # App startup and global font loaders
│   └── package.json           # Client dependency manifest
│
└── esp32_qemu_mock/           # virtual ESP32 IoT Device Firmware
    ├── main/
    │   └── main.cpp           # ESP-IDF C++ telemetry & OTA source code
    └── sdkconfig              # Compilation and hardware settings
```


mobile/src/features/farmer

Here we have the main navigation in FarmerNavigator.js, screens such as FarmerDashboard.js, BookStorageTab.js, DispatchTab.js, KhataTab.js, and ProfileTab.js.

The services folder contains services such as farmerService.js and kycService.js, while the hooks folder contains custom hooks such as useStorageTabDashboard.js and useKhataPayment.js.

On the backend, the Farmer module is located at:

backend/modules/farmer

Here we have the routes, controllers, repositories, and their respective subfolders.

Along with this, related functionality is handled by modules such as payment, kyc, amad, dispatch, and mandi.

---

## ⚙️ Getting Started

### Prerequisites
* **Node.js** (v18+)
* **Expo Go** application installed on Android or iOS.
* **ESP-IDF Toolchain** & **QEMU Simulator** (only required if compiling and simulating the IoT device).

---

### Step 1: Running the Backend Server

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables by copying the template file:
   ```bash
   cp .env.example .env
   ```
   *Modify the newly created `.env` file with your database URLs, Razorpay keys, and Supabase credentials.*
4. Initialize/migrate the PostgreSQL database structure:
   ```bash
   node migrate-db.js
   node migrate-admin-db.js
   ```
5. Run the automated Jest test suite to verify math and system calculations:
   ```bash
   npm test
   ```
6. Start the Express backend:
   ```bash
   npm run dev
   ```

---

### Step 2: Running the Mobile App

1. Open a new terminal and navigate to the `mobile` directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environmental endpoints:
   ```bash
   cp .env.example .env
   ```
   *Make sure `EXPO_PUBLIC_BACKEND_URL` matches your running backend instance.*
4. Start the Expo developer host:
   ```bash
   npm run dev
   ```
5. Scan the generated QR code in your terminal using **Expo Go** (Android) or your **Camera app** (iOS) to launch the app on your device.

---

### Step 3: Compiling & Simulating the Virtual ESP32 (QEMU)

The IoT device compiles under the ESP-IDF framework and runs within QEMU.

1. Open your **ESP-IDF Command Prompt / PowerShell** environment.
2. Navigate to the simulator directory:
   ```cmd
   cd esp32_qemu_mock
   ```
3. Build the binary files:
   ```cmd
   idf.py build
   ```
4. Merge the build outputs (bootloader, partition table, app binary) into a single 4MB flash image:
   ```cmd
   cd build
   esptool.py --chip esp32 merge_bin -o merged_flash.bin --fill-flash-size 4MB @flash_args
   cd ..
   ```
5. Launch the virtual device simulator in QEMU:
   ```cmd
   qemu-system-xtensa -nographic -machine esp32 -drive file=build/merged_flash.bin,if=mtd,format=raw -nic user,model=open_eth
   ```
   *The device will spin up, simulate hardware telemetry, connect to the backend MQTT server, and listen for OTA firmware updates.*

---

## 🔒 Security & Reliability Hardening

The codebase has undergone significant security and architectural upgrades:
* **Database Transactions:** Financial writes (payment verification, status updates, and ledger deduction balances) execute inside standard SQL transaction blocks (`BEGIN`/`COMMIT`/`ROLLBACK`) with row-level locks (`FOR UPDATE`) to prevent concurrent double-approvals.
* **Unified Auth Credentials:** Replaced unsafe notification shadow user accounts (historically containing `'dummy_hash'` passwords) with unified records linked to valid hashed MPINs.
* **Payment Capping Rules:** Backend Razorpay controllers enforce that checkout sessions are capped at the farmer's outstanding dues, preventing overpayment.
* **XSS Neutralization:** Safe DOM reading and HTML escaping helpers have been introduced on checkout templates to eliminate Script Injection vectors.
* **Centralized Constants:** Extracted hardcoded fallbacks (such as local IPs, port definitions, and default cold storage identifiers) to centralized config files (`constants.js`).

---

## ⚖️ License
This project is licensed under the MIT License. Feel free to use, modify, and distribute.
