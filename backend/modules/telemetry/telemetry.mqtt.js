const mqtt = require('mqtt');
const packetParser = require('./packet.parser');

const setupMQTTBroker = () => {
  // For the Live Demo with Wokwi, we connect to public HiveMQ
  // so Wokwi (in the browser) can reach this local backend!
  const client = mqtt.connect('mqtt://broker.hivemq.com:1883', { 
    clientId: 'Annsetu_Backend_' + Math.random().toString(16).substr(2, 8) 
  });

  client.on('connect', () => {
    console.log('✅ Annsetu Backend connected to HiveMQ (Live Demo Mode)');
    
    // Subscribe to all telemetry topics
    client.subscribe('annsetu/telemetry/#', (err) => {
      if (!err) {
        console.log('📡 Listening for telemetry data on annsetu/telemetry/#');
      }
    });
  });

  client.on('message', async (topic, message) => {
    const payload = message.toString();
    console.log(`\n[MQTT] Message received on ${topic}:`, payload);
    
    try {
      // Pass it directly into our robust parser and alert engine!
      await packetParser.processIncomingPacket(topic, payload, 'WOKWI_ESP32');
    } catch (error) {
      console.error(`[MQTT] Error parsing packet:`, error.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Client Error:', err);
  });

  return client;
};

module.exports = setupMQTTBroker;
