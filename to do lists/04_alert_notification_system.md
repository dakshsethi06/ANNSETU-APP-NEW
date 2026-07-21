# 4. Alert & Notification System

The backend must continuously evaluate incoming telemetry against configured thresholds and deliver alerts in role-appropriate language.

## 4.1 Alert Triggers
- [ ] High/Low Temperature, High/Low Humidity, Offline Device, Sensor Failure, Communication/Ethernet Failure, OTA Failure, Low Battery, Critical Battery.

### Alert Type Details (NEW)
- [ ] **Sensor Failure**: Fire when a device stops sending valid sensor data (null readings or out-of-range values). Severity: High.
- [ ] **Communication Failure**: Fire when a device misses its heartbeat window (device is reachable on network but not sending data). Severity: High.
- [ ] Both alert types must appear in the Company Admin web panel Device Management section and trigger push notifications to relevant admins.

## 4.2 Priority Levels
- [ ] **Critical**: Immediate action required (e.g. produce at risk)
- [ ] **High**: Operational issue (e.g. device offline, sensor failure)
- [ ] **Medium**: Warning (e.g. temp approaching threshold)
- [ ] **Low**: Informational

## 4.3 Notification Channels
- [ ] Mobile Push Notification, SMS, WhatsApp, Email, In-app Dashboard

## 4.4 Notification Payload — Two Formats by Role

### Mobile App (Farmer / Vendor — Plain Language)
- [ ] Translate all alerts into actionable business language before sending.
  - ✅ **"Chamber 3 is too warm (10°C). Your produce is at risk."**
  - ✅ **"Chamber 1 has gone offline. Contact your cold storage manager."**
  - ❌ Never send: "CC001 High Temp Alert", "ESP-NOW Failure", "RSSI drop"
- [ ] Payload must include: Chamber name (human-readable), current value, severity in plain words, and recommended action.

### Web Admin Panel (Technician / Admin — Technical Detail)
- [ ] Full technical payload: Timestamp, Device ID, Chamber ID, Temperature, Alert Type, Severity, RSSI, Battery Level, Firmware Version.
