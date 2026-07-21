# 5. Device Command & OTA Management

**Scope: Web Admin Panel ONLY.** No OTA controls, device restarts, or configuration tools should ever appear in the mobile app.

## 5.1 OTA Command Center (Web Admin Panel)
- [ ] **OTA Dashboard**: Display Current Version, Available Version, Update Progress, Success Rate, and list of Failed Devices.
- [ ] **OTA Scopes**: Allow updates targeting a Single Device, Chamber, Cold Storage, or Bulk (all devices).
- [ ] **OTA Scheduling**: Schedule updates for off-peak hours to avoid disruption.
- [ ] **Rollback Support**: Ability to roll back a firmware version if an update fails.

## 5.2 Diagnostics Hub (Web Admin Panel)
- [ ] **Deep Diagnostics View**: Battery voltage trends, RSSI signal trends, heartbeat intervals, and packet loss — all visualized for internal support teams.
- [ ] **Device Restart Control**: Only accessible to Technician, Company Admin, and Super Admin roles via the web panel. Never exposed in the mobile app.
- [ ] **Maintenance Logs**: Technicians can log notes against a device or chamber.

## 5.3 Configuration Tools (Web Admin Panel)
- [ ] **Threshold Settings**: Admins set Temperature/Humidity alert thresholds per chamber.
- [ ] **Sampling Intervals**: Configure how often devices send readings.
- [ ] **Heartbeat Intervals & Alert Delays**: Fine-tune device communication cadence.
- [ ] **OTA Schedules & Time Zones**: Configure deployment windows per region.

## 5.4 Device Management Workflows (Web Admin Panel)
- [ ] Register Device, Replace Device, Remove Device, Assign to Chamber.
- [ ] Change Firmware Version, View Full Device Logs, Update Configuration.

## 5.5 MAC Address → Barcode System (NEW)
- [ ] On device registration, capture the device **MAC Address**.
- [ ] Auto-generate a unique **barcode** (e.g. QR code or Code128) from the MAC address.
- [ ] Store the barcode image and MAC address together in the company database linked to the device record.
- [ ] Allow technicians to print the barcode and physically stick it on the device for field identification.
- [ ] Admin panel must support **barcode scanning** to instantly look up a device's full profile.

## 5.6 Two-Stage OTA Relay Architecture (NEW — Architecture TBD)
The OTA update flow uses a relay model through the Master Controller:

**Stage 1 — Cloud → Master Controller:**
- [ ] Company sends firmware binary to the **Master Controller** (one per cold storage facility) via the cloud.
- [ ] Master Controller downloads and installs the update on **itself first**.
- [ ] Master Controller reports back to cloud: "Self-update complete, proceeding to relay."

**Stage 2 — Master Controller → Child Nodes (via ESP-NOW):**
- [ ] After self-updating, the Master Controller acts as a **local OTA server**.
- [ ] It pushes the firmware binary to each Child Node over **ESP-NOW** (local wireless protocol).
- [ ] Each Child Node reboots and installs the update, then sends an ACK back to the Master Controller.
- [ ] Master Controller aggregates all ACKs and reports final OTA status (success/fail per node) to the cloud.

> ⚠️ **Architecture Decision Required**: The exact mechanism for Master Controller → Child Node OTA relay over ESP-NOW needs to be designed by the hardware/firmware team. Key questions: chunk size, retry logic, rollback on failure.
