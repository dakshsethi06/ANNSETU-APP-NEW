# Firmware Compilation Checklist (IoT Code)

Before compiling and flashing the provided `iotCode_corrected.md` code to the physical ESP32, the following hardcoded values must be updated to match the production or testing environment.

## 1. Wi-Fi Credentials
The device is currently hardcoded to connect to an office network. If this is not changed, the device will fail to connect and will boot into offline mode.
- **File Location:** `setup_wifi()` function
- **Change Required:** Update the SSID and Password.
  ```cpp
  // Change this:
  WiFi.begin("Office_Net", "OfficePass123");
  // To this:
  WiFi.begin("YOUR_SSID", "YOUR_PASSWORD");
  ```

## 2. MQTT Broker Address
The code attempts to connect to a production MQTT server.
- **File Location:** Global variables section
- **Change Required:** Update `mqttServerHost` to point to the actual broker you are testing with.
  ```cpp
  // Change this:
  const char* mqttServerHost = "mqtt.annsetu.com";
  // To this (example):
  const char* mqttServerHost = "broker.hivemq.com"; // Or your EC2 IP
  ```

## 3. HTTP Telemetry Endpoint
When pushing telemetry over HTTP (fallback or offline sync), the device POSTs to a hardcoded API URL. 
- **File Location:** Global variables section
- **Change Required:** Update this URL to point to the actual backend server IP or domain.
  ```cpp
  // Change this:
  const char* apiTelemetryUrl = "https://api.annsetu.com/v1/telemetry";
  // To this (example):
  const char* apiTelemetryUrl = "http://<YOUR_BACKEND_IP>:3000/api/telemetry/bulk"; // Or wherever your route handles it
  ```
*(Note: If using HTTP fallback, ensure the backend route can parse single JSON object payloads, or update the Node.js backend to support `/v1/telemetry` POST requests.)*

## 4. ESP-NOW Channel
If you are testing multiple devices (e.g., Master Hub communicating with Chamber Controllers over ESP-NOW), they must share the exact same Wi-Fi channel.
- **File Location:** End of `setup()` function
- **Change Required:** Ensure `primaryChan` matches the router's active 2.4GHz Wi-Fi channel, otherwise the local mesh will break.
  ```cpp
  uint8_t primaryChan = 1; // Must match your router's WiFi channel
  ```
