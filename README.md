# 🌾 Annsetu (अन्नसेतु)
### Connecting Farmers to Live Mandi Prices

**Annsetu** ("bridge of food/grain" in Sanskrit) is a mobile application designed to bridge the information gap for farmers by providing real-time commodity prices sourced directly from the Government of India's Open Data Portal.

---

## 🚀 Key Features
* **Real-time Price Sync:** Fetches active commodity prices directly from the official Indian government dataset (`data.gov.in`).
* **Clean UI/UX:** High-contrast, easy-to-read price cards optimized for outdoor environments.
* **Offline-Resilient Error Handling:** Gracefully handles network timeouts, API rate limits, and offline scenarios.

---

## 🛠️ Tech Stack & Architecture

### **Mobile App (Frontend)**
* **Framework:** React Native with Expo (SDK 54)
* **Design System:** Custom HSL palette featuring accessible contrast ratios.
* **API Client:** Native `fetch` API directly interacting with the government REST endpoints.

### **Proxy Server (Backend)**
* **Runtime:** Node.js (Express)
* **Purpose:** Built as an optional proxy server to encapsulate API keys and perform price aggregations.
* **Dependencies:** `axios`, `cors`, `dotenv`.

---

## 📁 Project Directory

```text
annsetu/
├── mobile/                   # React Native (Expo) Client
│   ├── App.js                # App entry point
│   ├── app.json              # Expo configuration
│   ├── package.json          # Dependency manifest
│   └── src/
│       ├── screens/
│       │   └── HomeScreen.js # Main UI screen & interaction logic
│       ├── services/
│       │   └── api.js        # API service layer (data.gov.in)
│       └── theme.js          # App style tokens & custom theme
│
└── backend/                  # Node.js (Express) API Proxy
    ├── server.js             # Server routing and aggregation logic
    ├── package.json          # Dependency manifest
    └── .env.example          # Environment variables template
```

---

## ⚙️ Getting Started

### Prerequisites
* **Node.js** (v18+)
* **Expo Go** app installed on your Android/iOS device.

---

### Step 1: Running the Mobile App (Expo Go)
The mobile app calls the government API directly and can run independently of the backend server.

1. Navigate to the `mobile` directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npm run start
   ```
4. **Scan the QR Code** printed in your terminal using the **Expo Go** app (Android) or your **Camera app** (iOS).

---

### Step 2: Running the Proxy Server (Optional)
If you want to run the Express backend proxy server:

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   copy .env.example .env
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

---

## 📡 API Details
* **Source:** Open Government Data (OGD) Platform India (`api.data.gov.in`)
* **Resource:** Mandi Market Prices (Agriculture Marketing)
* **Filters:** Currently configured to retrieve Potato prices in Uttar Pradesh.

---

## ⚖️ License
This project is licensed under the MIT License. Feel free to use, modify, and distribute.
