const { fork } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '🌾 Annsetu: Starting Mock Environment...');

// Port config
const SERVER_1_PORT = process.env.PORT || 3001;
const SERVER_2_PORT = 3002;

// Fork Server 2 (Mock API Server)
const server2 = fork(path.join(__dirname, 'mock-server.js'), [], {
  stdio: 'inherit'
});

// Fork Server 1 (Backend Gateway)
// Injecting variables so it resolves to Server 2 instead of the actual data.gov.in
const server1 = fork(path.join(__dirname, 'server.js'), [], {
  env: {
    ...process.env,
    PORT: SERVER_1_PORT,
    USE_MOCK_SERVER: 'true',
    MANDI_API_URL: `http://localhost:${SERVER_2_PORT}/api/v1/mandi-prices`,
    MANDI_API_KEY: 'mock_key_for_testing' // Bypass real key check
  },
  stdio: 'inherit'
});

// Shutdown cleanup
process.on('SIGINT', () => {
  console.log('\nStopping servers...');
  server1.kill();
  server2.kill();
  process.exit(0);
});

server1.on('close', (code) => {
  console.log(`Server 1 stopped with exit code ${code}`);
  server2.kill();
  process.exit(code);
});

server2.on('close', (code) => {
  console.log(`Server 2 stopped with exit code ${code}`);
  server1.kill();
  process.exit(code);
});
