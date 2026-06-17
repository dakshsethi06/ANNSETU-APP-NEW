# Mandi-Info

A app that fetches live mandi prices for **Potato in Uttar Pradesh** from the Government of India's open data portal (data.gov.in).

It prvides the current maximum and minimum price of the mandis.

---

## Tech Stack

- **Mobile:** React Native + Expo
- **Backend:** Node.js + Express

---

## Project Structure
├── backend/

│   ├── server.js        ← Express server, calls the govt API and returns clean JSON

│   ├── package.json     ← Backend dependencies

│   ├── .env.example     ← Template for environment variables

│   └── .env             ← Your actual API key (never push this)

│

├── mobile/

│   ├── App.js           ← Entry point, loads the home screen

│   ├── index.js         ← Registers the app with Expo

│   ├── app.json         ← Expo app configuration (name, icon, splash)

│   ├── eas.json         ← Build configuration for APK generation

│   └── src/             ← Screens, API logic, and theme

│

└── README.md

## How it works

Our app calls the Express backend, which retrieves mandi price data from Data.gov.in using our API key, calculates the minimum and maximum prices, and returns them to the app for display.