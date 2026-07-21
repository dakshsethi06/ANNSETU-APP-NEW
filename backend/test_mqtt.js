const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('[Test Client] Connected to MQTT broker');
  
  const payload = {
    type: 'SENSOR_DATA',
    data: {
      temperature: 4.5,
      humidity: 88,
      chamberId: 'CH_001'
    }
  };
  
  client.publish('annsetu/telemetry/CH_001', JSON.stringify(payload), (err) => {
    if (err) {
      console.error('[Test Client] Publish error:', err);
    } else {
      console.log('[Test Client] Published SENSOR_DATA successfully');
    }
    
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 1000);
  });
});

client.on('error', (err) => {
  console.error('[Test Client] Connection error:', err);
  process.exit(1);
});
