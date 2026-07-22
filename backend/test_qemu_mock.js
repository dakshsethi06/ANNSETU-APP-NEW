const mqtt = require('mqtt');

const macAddress = process.argv[2];

if (!macAddress) {
  console.log('Usage: node test_qemu_mock.js <MAC_ADDRESS>');
  console.log('Example: node test_qemu_mock.js 52:54:00:12:34:56');
  process.exit(1);
}

const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
  console.log('[Test Script] Connected to HiveMQ Public Broker');
  
  const topic = `device/${macAddress}/cmd/status`;
  const payload = {
    action: 'inactive'
  };
  
  console.log(`[Test Script] Sending Deactivate command to: ${topic}`);
  
  client.publish(topic, JSON.stringify(payload), (err) => {
    if (err) {
      console.error('[Test Script] Failed to send command:', err);
    } else {
      console.log('[Test Script] Success! Look at your QEMU terminal!');
    }
    
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 1000);
  });
});
