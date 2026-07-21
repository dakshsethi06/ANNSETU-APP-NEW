# 6. Mobile Application Requirements

The mobile app is a **peace-of-mind dashboard** for farmers and vendors — NOT a technical control panel. All hardware controls live exclusively in the Web Admin Panel.

## 6.1 What to SHOW (Farmer / Vendor View)
- [ ] **Live Climate Monitoring**: Show Temperature and Humidity for each chamber — clean, large, easy to read.
- [ ] **Crop Safety Indicators**: Temperature and humidity graphs must have clear **"Safe Zone" (green)** and **"Danger Zone" (red)** color bands so the status is understood at a single glance.
- [ ] **Simple Device Status**: Show a green 🟢 **Online** or red 🔴 **Needs Maintenance** badge per chamber. Never show raw error codes like "ESP-NOW Comm Failure".
- [ ] **Battery Status**: Show battery level as a simple percentage bar — no voltage readings.
- [ ] **Offline Alerts**: Show a clear banner if a chamber goes offline.

## 6.2 What to HIDE (Removed from Mobile App)
- [ ] ~~OTA Progress viewing~~ → **Web Admin Panel only**
- [ ] ~~Device Restart controls~~ → **Web Admin Panel only**
- [ ] ~~RSSI / Signal Strength metrics~~ → **Web Admin Panel only**
- [ ] ~~MAC Addresses~~ → **Web Admin Panel only**
- [ ] ~~Packet Loss stats~~ → **Web Admin Panel only**
- [ ] ~~Raw device error codes~~ → Translate to plain business language before showing

## 6.3 Actionable Push Notifications
- [ ] Mobile push notifications must be written in plain business language. Example format:
  - ✅ Good: **"Chamber 3 is too warm (10°C). Your produce is at risk."**
  - ❌ Bad: "CC001 High Temp Alert — threshold exceeded"
- [ ] Every notification must include: Chamber name, current value, and a simple recommended action.

## 6.4 Mobile-Accessible Reports
- [ ] **Simple Daily/Weekly climate summary** viewable in-app.
- [ ] No access to device health reports, OTA logs, or communication reports (web-only).

## 6.5 Cold Storage Dashboard — Temperature & Humidity Page (NEW)
- [ ] Add a dedicated **Temperature & Humidity page** inside the Cold Storage dashboard section.
- [ ] Show live Temperature and Humidity readings per chamber with large, clear display.
- [ ] Include trend graphs with **Safe Zone (green)** and **Danger Zone (red)** color bands.
- [ ] Show timestamp of last reading per chamber.
- [ ] Page must auto-refresh every 5 seconds.
