const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://127.0.0.1:1883', { clientId: 'TestClient_E2E' });

client.on('error', (err) => console.error('MQTT Error:', err));

const DEVICE_ID = 'DEV_12345';
const CHAMBER_ID = 'CH_001';
const TOPIC = 'annsetu/telemetry/MC1';

client.on('connect', () => {
  console.log('✅ Connected to local Aedes MQTT Broker');

  // 1. Send normal HEARTBEAT
  const heartbeat = {
    type: 'HEARTBEAT',
    data: {
      device_id: DEVICE_ID,
      chamber_id: CHAMBER_ID,
      status_code: 0,
      rssi: -50,
      uptime: 3600,
      timestamp: Math.floor(Date.now() / 1000)
    }
  };
  client.publish(TOPIC, JSON.stringify(heartbeat));
  console.log('Published HEARTBEAT');

  // 2. Wait 2 seconds, send SENSOR_DATA (Normal)
  setTimeout(() => {
    const normalSensor = {
      type: 'SENSOR_DATA',
      data: {
        device_id: DEVICE_ID,
        chamber_id: CHAMBER_ID,
        temperature: 4.5, // Normal
        humidity: 60.0,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };
    client.publish(TOPIC, JSON.stringify(normalSensor));
    console.log('Published SENSOR_DATA (Normal)');
  }, 2000);

  // 3. Wait 4 seconds, send SENSOR_DATA (High Temp)
  setTimeout(() => {
    const highTempSensor = {
      type: 'SENSOR_DATA',
      data: {
        device_id: DEVICE_ID,
        chamber_id: CHAMBER_ID,
        temperature: 12.0, // HIGH_TEMP Alert (> 8.0)
        humidity: 60.0,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };
    client.publish(TOPIC, JSON.stringify(highTempSensor));
    console.log('Published SENSOR_DATA (High Temp)');
  }, 4000);

  // 4. Wait 6 seconds, send SENSOR_DATA (Sensor Failure)
  setTimeout(() => {
    const failSensor = {
      type: 'SENSOR_DATA',
      data: {
        device_id: DEVICE_ID,
        chamber_id: CHAMBER_ID,
        temperature: null, // SENSOR_FAILURE Alert
        humidity: null,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };
    client.publish(TOPIC, JSON.stringify(failSensor));
    console.log('Published SENSOR_DATA (Sensor Failure)');
  }, 6000);

  // Close connection after 8 seconds
  setTimeout(() => {
    console.log('Test completed. Closing connection.');
    client.end();
  }, 8000);
});
