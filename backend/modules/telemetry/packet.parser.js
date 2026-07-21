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

  if (!type) {
    throw new Error('Payload missing "type" field');
  }

  switch (type) {
    case 'HEARTBEAT':
      await handleHeartbeat(clientId, data);
      break;
    case 'SENSOR_DATA':
      await handleSensorData(clientId, data);
      break;
    case 'BATTERY':
      await handleBattery(clientId, data);
      break;
    case 'ALERT':
      await handleAlert(clientId, data);
      break;
    case 'OTA_REQUEST':
      await handleOtaRequest(clientId, data);
      break;
    case 'OTA_DATA':
      await handleOtaData(clientId, data);
      break;
    case 'OTA_COMPLETE':
      await handleOtaComplete(clientId, data);
      break;
    case 'ACK':
      await handleAck(clientId, data);
      break;
    case 'ERROR':
      await handleError(clientId, data);
      break;
    case 'DEVICE_STATUS':
      await handleDeviceStatus(clientId, data);
      break;
    default:
      console.warn(`[PacketParser] Unknown payload type: ${type}`);
  }
};

const { evaluateTelemetry } = require('../alerts/alert.engine');

// Handlers for each packet type (to be expanded with DB logic)
const handleHeartbeat = async (clientId, data) => {
  console.log(`[PacketParser] HEARTBEAT from ${clientId}`);
  // Update last communication timestamp in DB
};

const handleSensorData = async (clientId, data) => {
  console.log(`[PacketParser] SENSOR_DATA from ${clientId}:`, data);
  // Insert telemetry data into DB
  
  // Evaluate thresholds and failures
  await evaluateTelemetry(clientId, data);
};

const handleBattery = async (clientId, data) => {
  console.log(`[PacketParser] BATTERY from ${clientId}:`, data);
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
