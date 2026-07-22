/**
 * Parses and processes incoming packets from IoT devices.
 * Expected Payload Types:
 * 1. HEARTBEAT
 * 2. SENSOR_DATA
 * 3. BATTERY
 * 4. ALERT
 * 5. OTA_REQUEST
 * 6. OTA_DATA
 * 7. OTA_COMPLETE
 * 8. ACK
 * 9. ERROR
 * 10. DEVICE_STATUS
 */

const processIncomingPacket = async (topic, payloadString, clientId) => {
  let payload;
  try {
    payload = JSON.parse(payloadString);
  } catch (e) {
    throw new Error('Invalid JSON payload');
  }

  const { type, data } = payload;

  // Auto-detect flat sensor payloads from real ESP32/QEMU firmware
  // These arrive as: { device_id, temperature, humidity, battery_voltage, rssi }
  // instead of the wrapped: { type: "SENSOR_DATA", data: { ... } }
  if (!type) {
    if (payload.temperature !== undefined || payload.humidity !== undefined) {
      console.log(`[PacketParser] Auto-detected flat SENSOR_DATA payload, normalizing...`);
      const deviceId = payload.device_id || clientId;
      await handleSensorData(deviceId, {
        temperature: payload.temperature,
        humidity: payload.humidity,
        battery_voltage: payload.battery_voltage,
        rssi: payload.rssi,
        chamberId: payload.chamber_id || null
      });
      return;
    }
    throw new Error('Payload missing "type" field');
  }

  const typeLower = type ? type.toLowerCase() : null;
  const payloadData = data || payload;

  switch (typeLower) {
    case 'heartbeat':
      await handleHeartbeat(clientId, payloadData);
      break;
    case 'sensor_data':
    case 'sensor':
      await handleSensorData(clientId, payloadData);
      break;
    case 'battery':
      await handleBattery(clientId, payloadData);
      break;
    case 'alert':
      await handleAlert(clientId, payloadData);
      break;
    case 'ota_request':
      await handleOtaRequest(clientId, payloadData);
      break;
    case 'ota_data':
      await handleOtaData(clientId, payloadData);
      break;
    case 'ota_complete':
      await handleOtaComplete(clientId, payloadData);
      break;
    case 'ack':
      await handleAck(clientId, payloadData);
      break;
    case 'error':
      await handleError(clientId, payloadData);
      break;
    case 'device_status':
      await handleDeviceStatus(clientId, payloadData);
      break;
    default:
      console.warn(`[PacketParser] Unknown payload type: ${type}`);
  }
};

const { evaluateTelemetry } = require('../alerts/alert.engine');
const pool = require('../../config/database');

const updateDeviceLastSeen = async (clientId) => {
  if (!pool) return;
  try {
    const cleanId = clientId.toUpperCase();
    await pool.query(
      `UPDATE devices SET last_seen_at = NOW(), status = 'ACTIVE' WHERE mac_address = $1 OR device_id = $1`,
      [cleanId]
    );
  } catch (err) {
    console.error(`[PacketParser] Error updating last_seen_at for ${clientId}:`, err.message);
  }
};

// Handlers for each packet type (to be expanded with DB logic)
const handleHeartbeat = async (clientId, data) => {
  console.log(`[PacketParser] HEARTBEAT from ${clientId}`);
  await updateDeviceLastSeen(clientId);
  
  if (!pool) return;
  const deviceId = data.device_id || clientId;
  try {
    await pool.query(
      `INSERT INTO "TelemetryLogs" ("device_id", "uptime", "status_code", "rssi") VALUES ($1, $2, $3, $4)`,
      [deviceId, data.uptime || null, data.status_code || null, data.rssi || null]
    );
  } catch (err) {
    console.error('[PacketParser] DB Insert Error for Heartbeat:', err.message);
  }
};

const handleSensorData = async (clientId, data) => {
  console.log(`[PacketParser] SENSOR_DATA from ${clientId}:`, data);
  await updateDeviceLastSeen(clientId);
  
  // Evaluate thresholds and failures BEFORE inserting so alerts fire immediately
  await evaluateTelemetry(clientId, data);

  if (!pool) return;
  const deviceId = data.device_id || clientId;
  try {
    await pool.query(
      `INSERT INTO "TelemetryLogs" ("device_id", "temperature", "humidity", "battery_voltage", "rssi") VALUES ($1, $2, $3, $4, $5)`,
      [deviceId, data.temperature, data.humidity, data.battery_voltage || null, data.rssi || null]
    );
  } catch (err) {
    console.error('[PacketParser] DB Insert Error for SensorData:', err.message);
  }
};

const handleBattery = async (clientId, data) => {
  console.log(`[PacketParser] BATTERY from ${clientId}:`, data);
  await updateDeviceLastSeen(clientId);

  if (!pool) return;
  const deviceId = data.device_id || clientId;
  try {
    await pool.query(
      `INSERT INTO "TelemetryLogs" ("device_id", "battery_voltage", "battery_percentage", "charging_state") VALUES ($1, $2, $3, $4)`,
      [deviceId, data.voltage || data.battery_voltage, data.percentage || data.battery_percentage, data.charging_state || null]
    );
  } catch (err) {
    console.error('[PacketParser] DB Insert Error for Battery:', err.message);
  }
};

const handleAlert = async (clientId, data) => {
  console.log(`[PacketParser] ALERT from ${clientId}:`, data);
};

const handleOtaRequest = async (clientId, data) => {
  console.log(`[PacketParser] OTA_REQUEST from ${clientId}:`, data);
};

const handleOtaData = async (clientId, data) => {
  console.log(`[PacketParser] OTA_DATA from ${clientId}:`, data);
};

const handleOtaComplete = async (clientId, data) => {
  console.log(`[PacketParser] OTA_COMPLETE from ${clientId}:`, data);
};

const handleAck = async (clientId, data) => {
  console.log(`[PacketParser] ACK from ${clientId}:`, data);
};

const handleError = async (clientId, data) => {
  console.error(`[PacketParser] ERROR from ${clientId}:`, data);
};

const handleDeviceStatus = async (clientId, data) => {
  console.log(`[PacketParser] DEVICE_STATUS from ${clientId}:`, data);
};

module.exports = {
  processIncomingPacket,
};
