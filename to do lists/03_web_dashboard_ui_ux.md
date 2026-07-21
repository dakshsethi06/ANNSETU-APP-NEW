# 3. Web Dashboard UI/UX Requirements

The web dashboard is the **technical command center** for internal teams (Super Admin, Company Admin, Technician). It has strict 5-second auto-refresh and exposes ALL technical data that is hidden from the mobile app.

## 3.1 Dashboard Home
- [ ] Total Cold Storages, Total Chambers, Online/Offline Devices, Active Alerts, Average Temperature, Average Humidity, Cloud Status, Last Synchronization Time.

## 3.2 Cold Storage Dashboard
- [ ] Name, Number of Chambers, Online/Offline Devices, Today's Alerts, Network Health, Device Health, Temperature Summary.

## 3.3 Chamber Dashboard
- [ ] Live Temperature, Live Humidity, Battery Level, RSSI, Communication Status, Last Updated Time, Firmware Version, Device Health.

## 3.4 Device Dashboard (Full Technical View)
- [ ] Device ID, MAC Address, Firmware Version, Battery Voltage, RSSI, Packet Loss %, Temperature, Humidity, Last Heartbeat Timestamp, Installation Date.
- [ ] Raw error codes and technical status visible here (e.g. "ESP-NOW Comm Failure", heartbeat interval drift).

## 3.5 OTA Command Center (Web Admin Panel Exclusive)
- [ ] Current Firmware Version vs. Available Version per device.
- [ ] OTA Update Progress tracking (%), Success Rate, list of Failed Devices.
- [ ] OTA scopes: Single Device, Chamber, Cold Storage, Bulk.
- [ ] Schedule and trigger firmware updates.

## 3.6 Diagnostics Hub (Web Admin Panel Exclusive)
- [ ] Battery voltage trend charts, RSSI trend charts, heartbeat interval monitoring.
- [ ] Packet loss visualization over time.
- [ ] Device Restart button (Technician / Admin roles only).
- [ ] Configuration panel: Sampling intervals, alert thresholds, heartbeat intervals, alert delays, OTA schedules, time zones.

## 3.7 Charting Engine
- [ ] Temperature, Humidity, Battery, RSSI, Communication Health, Alert Frequency trend charts.
- [ ] Chart filters: Hourly, Daily, Weekly, Monthly, Yearly.

## 3.8 Reporting Engine
- [ ] Export Daily, Weekly, Monthly, Alert, Device Health, Communication, Temperature, and Battery reports.
- [ ] Formats: PDF, Excel, CSV.

## 3.9 Company Admin — Device Management Panel (NEW)

### Actions
- [ ] **Add Device**: Register a new device by entering its MAC address; auto-generate and store a barcode for it.
- [ ] **Activate / Deactivate Device**: Toggle a device on/off without deleting it from the system.
- [ ] **Firmware Version Update**: Select a device and push a firmware update (triggers the 2-stage OTA relay via Master Controller).

### Display per Device
- [ ] **Device Status**: Online / Offline indicator (green/red badge).
- [ ] **Signal Strength**: RSSI value with a visual signal bar.
- [ ] **Firmware Version**: Currently running firmware version on the device.
- [ ] **Last Communication**: Timestamp of the last received data packet.
- [ ] **Sensor Health**: Healthy / Needs Attention status indicator.

### Device-Level Alerts (shown in admin panel)
- [ ] **Sensor Failure Alert**: Trigger when a sensor stops sending valid data.
- [ ] **Communication Failure Alert**: Trigger when a device misses its expected heartbeat window.
