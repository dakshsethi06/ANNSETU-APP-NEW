# 2. Database Schema & Data Models

The database must rigidly reflect the physical installation environments and strict data retention policies.

- [ ] **Relational Hierarchy**: Cold Storage Facility → Chamber → Chamber Controller & Master → Child Nodes.
- [ ] **Device Registry**: Every device entry must contain: Device ID, Serial Number, Firmware Version, Hardware Version, Chamber ID, Cold Storage ID, Installation Date, MAC Address, Device Status, and **Barcode Reference**.
- [ ] **Data Retention**: Temperature, humidity, RSSI, battery logs, alerts, and device status logs must be retained for a minimum of 5 years.

## 2.4 Barcode / Asset Tag Table (NEW)
- [ ] Store the generated barcode image (or barcode string) linked to each device's MAC address.
- [ ] Fields: `device_id`, `mac_address`, `barcode_value`, `barcode_image_url`, `generated_at`, `printed_at`.
- [ ] The barcode record is created automatically when a device is registered via the admin panel.
- [ ] Barcode must be unique per device — one MAC address = one barcode.

## 2.5 Admin Panel Sync (TODO)
- [ ] **TODO (PENDING HIGHER-UP CONFIRMATION)**: Decide whether the Admin Panel should query the FDW `annsetu_remote."Devices"` (live sync with IoT source DB) or strictly query the local `public.devices` table shown in the Supabase screenshot.
