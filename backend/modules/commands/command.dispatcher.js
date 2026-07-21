const mqtt = require('mqtt');
require('dotenv').config({ path: '../.env' });

// We use the same HiveMQ broker used for telemetry
const brokerUrl = 'mqtt://broker.hivemq.com';
let mqttClient;

const initDispatcher = () => {
  mqttClient = mqtt.connect(brokerUrl);
  mqttClient.on('connect', () => {
    console.log('[CommandDispatcher] Connected to MQTT Broker for pushing commands.');
  });
  mqttClient.on('error', (err) => {
    console.error('[CommandDispatcher] MQTT Connection Error:', err);
  });
};

/**
 * Dispatch a command to a specific device via MQTT
 * @param {string} deviceId - The MAC address or Chamber ID of the target
 * @param {Object} payload - The command payload (e.g. { command: 'START_OTA', url: '...' })
 */
const dispatchCommand = async (deviceId, payload) => {
  if (!mqttClient || !mqttClient.connected) {
    throw new Error('MQTT Client not connected');
  }

  const topic = `annsetu/commands/${deviceId}`;
  
  return new Promise((resolve, reject) => {
    mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        console.error(`[CommandDispatcher] Failed to dispatch to ${topic}:`, err);
        return reject(err);
      }
      console.log(`[CommandDispatcher] Dispatched command to ${topic}:`, payload);
      resolve(true);
    });
  });
};

module.exports = {
  initDispatcher,
  dispatchCommand
};
