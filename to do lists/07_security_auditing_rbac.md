# 7. Security, Auditing & Role-Based Access Control (RBAC)

The system must be highly secure with strict role boundaries. The mobile app is read-only for farmers/vendors; all technical controls are web-only.

## 7.1 Security Standards
- [ ] HTTPS communication, JWT authentication, Hashed passwords, Unique Authentication Keys per device.

## 7.2 Audit Logging (5-year retention)
- [ ] Record: Login, Logout, Configuration Changes, OTA triggers, Alert Acknowledgements, Device Assignments, User Changes.

## 7.3 Role Definitions & Access

| Role | Platform | Access |
|---|---|---|
| **Super Admin** | Web | Full access: platform management, firmware, all users, all data |
| **Company Admin** | Web | Manage assigned cold storages, assign users, configure thresholds |
| **Technician** | Web | Device diagnostics, OTA execution, device restart, maintenance logs |
| **Cold Storage Owner** | Mobile + Web (read-only) | View own chambers, receive climate alerts, view simple reports |
| **Vendor / Farmer** | Mobile only | View assigned chambers (read-only), receive plain-language push alerts |

## 7.4 Mobile App Role Enforcement
- [ ] Farmers and Vendors must be mapped to the **"Vendor"** or **"Cold Storage Owner"** role — strictly **read-only**.
- [ ] These roles must **never** see: OTA controls, device restart, RSSI/MAC/packet loss data, or raw error codes.
- [ ] Enforce at the API level — not just in the UI — so these fields are never returned in mobile API responses.

## 7.5 Web Admin Panel Role Enforcement
- [ ] OTA, device restart, diagnostics, and configuration endpoints must reject requests from Cold Storage Owner / Vendor tokens with a `403 Forbidden`.
- [ ] Technicians can execute OTA and restarts but **cannot** manage users or configure billing.
