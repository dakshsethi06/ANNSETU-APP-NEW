require('dotenv').config();
const packetParser = require('./modules/telemetry/packet.parser');

const DEVICE_ID = 'DEV_12345';
const CHAMBER_ID = 'CH_001';
const TOPIC = 'annsetu/telemetry/MC1';
const CLIENT_ID = 'TestClient_Direct';

const runTests = async () => {
  console.log('--- STARTING DIRECT LOGIC TESTS ---');

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
  await packetParser.processIncomingPacket(TOPIC, JSON.stringify(heartbeat), CLIENT_ID);
  console.log('✅ Sent HEARTBEAT');

  // 2. Send SENSOR_DATA (Normal)
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
  await packetParser.processIncomingPacket(TOPIC, JSON.stringify(normalSensor), CLIENT_ID);
  console.log('✅ Sent SENSOR_DATA (Normal)');

  // 3. Send SENSOR_DATA (High Temp)
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
  await packetParser.processIncomingPacket(TOPIC, JSON.stringify(highTempSensor), CLIENT_ID);
  console.log('✅ Sent SENSOR_DATA (High Temp)');

  // 4. Send SENSOR_DATA (Sensor Failure)
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
  await packetParser.processIncomingPacket(TOPIC, JSON.stringify(failSensor), CLIENT_ID);
  console.log('✅ Sent SENSOR_DATA (Sensor Failure)');

  console.log('--- ALL TESTS DISPATCHED ---');
  setTimeout(() => process.exit(0), 1000);
};

runTests();
