# 5. Device Command & OTA Management

**Scope: Web Admin Panel ONLY.** No OTA controls, device restarts, or configuration tools should ever appear in the mobile app.

## 5.1 OTA Command Center (Web Admin Panel)
- [ ] **OTA Dashboard**: Display Current Version, Available Version, Update Progress, Success Rate, and list of Failed Devices.
- [ ] **OTA Scopes**: Allow updates targeting a Single Device, Chamber, Cold Storage, or Bulk (all devices).
- [ ] **OTA Scheduling**: Schedule updates for off-peak hours to avoid disruption.
- [ ] **Rollback Support**: Ability to roll back a firmware version if an update fails.

## 5.2 Diagnostics Hub (Web Admin Panel)
- [ ] **Deep Diagnostics View**: Visualize battery voltage, RSSI signal trends, and heartbeat intervals.
- [ ] **Battery Health Percentage**: Display "Battery Health" as a percentage (e.g., 85%) instead of just current charge level, tracking degradation over time.
- [ ] **Actionable Sensor Alerts**: When sensor failures occur, visually link them to a protocol prompt (e.g., "Call Cold Storage Manager to replace sensor").
- [ ] **Device Restart Control**: Only accessible to Admin/Super Admin via web panel.
- [ ] **Maintenance Logs**: Technicians can log notes against a device or chamber.

## 5.3 Configuration & Setup (Web Admin Panel)
- [ ] **Sequential MAC Pairing Wizard**: UI flow forcing users to link MACs in order: Master Controller -> Chamber Controller -> Child Nodes.
- [ ] **Cloud-to-Device Configuration Push**: Sending a payload via MQTT to configure the Master Controller with its allowed child nodes' MAC addresses for ESP-NOW.
- [ ] **Two-Step Device Lifecycle**: New devices default to "Disabled/Inactive". Only marked "Active" when a technician completes the setup wizard.
- [ ] **Threshold Settings**: Admins set Temperature/Humidity alert thresholds per chamber.
- [ ] **Sampling Intervals**: Configure how often devices send readings.

## 5.4 Device Management Workflows (Web Admin Panel)
- [x] Register Device, Replace Device, Remove Device, Assign to Chamber. *(Partially Done: Register Device is done)*
- [ ] Change Firmware Version, View Full Device Logs, Update Configuration.

## 5.5 MAC Address → Barcode System (NEW)
- [x] On device registration, capture the device **MAC Address**.
- [x] Auto-generate a unique **barcode** (e.g. QR code or Code128) from the MAC address.
- [x] Store the barcode image and MAC address together in the company database linked to the device record.
- [x] Allow technicians to print the barcode and physically stick it on the device for field identification.
- [x] Admin panel must support **barcode scanning** to instantly look up a device's full profile.

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
