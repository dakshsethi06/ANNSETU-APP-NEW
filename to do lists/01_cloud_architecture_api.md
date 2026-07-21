# 1. Cloud Architecture & API Services

The backend must handle data ingestion, device management, and user facing portals across several microservices.

- [ ] **API Gateway**: Routes incoming traffic and secures endpoints.
- [ ] **Authentication Service**: Manages user sessions using JWT and hashes all passwords.
- [ ] **Telemetry Service**: Ingests live data over HTTPS + MQTT.
- [ ] **Packet Parsing**: The API must be built to parse 10 specific incoming payload types: HEARTBEAT, SENSOR_DATA, BATTERY, ALERT, OTA_REQUEST, OTA_DATA, OTA_COMPLETE, ACK, ERROR, and DEVICE_STATUS.
- [ ] **Disaster Recovery Sync**: The telemetry API must support bulk-data ingestion; if a Master Controller loses internet, it buffers data locally and will upload thousands of historical records at once upon reconnection.
- [ ] **Device Management Service**: Manages hardware registration and state.
- [ ] **OTA & Notification Services**: Handles firmware delivery and alert dispatching.
