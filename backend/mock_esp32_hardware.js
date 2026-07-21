const mqtt = require('mqtt');

// Connect to HiveMQ just like the real ESP32 would
const client = mqtt.connect('mqtt://broker.hivemq.com:1883', { clientId: 'MockESP32_' + Date.now() });

const DEVICE_ID = 'DEV_WOKWI_DEMO';
const CHAMBER_ID = 'CH_DEMO';
const TOPIC = 'annsetu/telemetry/MC1';

client.on('connect', () => {
  console.log('🔌 Mock ESP32 Hardware connected to WiFi & HiveMQ');
  
  // 1. Send normal data
  setTimeout(() => {
    console.log('🌡️ Sending Normal Temperature (4.5°C)...');
    client.publish(TOPIC, JSON.stringify({
      type: 'SENSOR_DATA',
      data: { device_id: DEVICE_ID, chamber_id: CHAMBER_ID, temperature: 4.5, humidity: 60.0, timestamp: Math.floor(Date.now() / 1000) }
    }));
  }, 2000);

  // 2. Send high temp data
  setTimeout(() => {
    console.log('🔥 Sending HIGH Temperature (12.5°C)...');
    client.publish(TOPIC, JSON.stringify({
      type: 'SENSOR_DATA',
      data: { device_id: DEVICE_ID, chamber_id: CHAMBER_ID, temperature: 12.5, humidity: 60.0, timestamp: Math.floor(Date.now() / 1000) }
    }));
  }, 6000);

  // 3. Send sensor failure
  setTimeout(() => {
    console.log('💥 Sending SENSOR FAILURE (Disconnected wire)...');
    client.publish(TOPIC, JSON.stringify({
      type: 'SENSOR_DATA',
      data: { device_id: DEVICE_ID, chamber_id: CHAMBER_ID, temperature: null, humidity: null, timestamp: Math.floor(Date.now() / 1000) }
    }));
  }, 10000);

  setTimeout(() => {
    console.log('✅ Demo sequence finished.');
    process.exit(0);
  }, 12000);
});

client.on('error', (err) => console.error('Error:', err));
