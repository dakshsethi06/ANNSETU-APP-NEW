const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const setupMQTTBroker = require('./modules/telemetry/telemetry.mqtt');
const { startWatchdog } = require('./modules/alerts/watchdog.cron');
const { initDispatcher } = require('./modules/commands/command.dispatcher');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize MQTT Broker
setupMQTTBroker();
initDispatcher();
startWatchdog();

// Middlewares
const allowedOrigins = process.env.CORS_WHITELIST 
  ? process.env.CORS_WHITELIST.split(',') 
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:8081'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authMiddleware = require('./shared/middleware/auth.middleware');
app.use('/api', authMiddleware);

// Routes mounted directly using the modular index entry points
app.use('/api', require('./modules/mandi'));
app.use('/api', require('./modules/weather'));
app.use('/api', require('./modules/farmer'));
app.use('/api', require('./modules/amad'));
app.use('/api', require('./modules/telemetry'));
app.use('/api', require('./modules/device-management'));
app.use('/api', require('./modules/ota'));
app.use('/api/commands', require('./modules/commands/command.routes'));
app.use('/api', require('./modules/storage'));
app.use('/api', require('./modules/notification'));
app.use('/api', require('./modules/cron'));
app.use('/api', require('./modules/dispatch'));
app.use('/api', require('./modules/payment'));
app.use('/api', require('./modules/user-role'));
app.use('/api', require('./modules/support'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
