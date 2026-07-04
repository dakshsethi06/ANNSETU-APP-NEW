const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes mounted directly using the modular index entry points
app.use('/api', require('./modules/mandi'));
app.use('/api', require('./modules/farmer'));
app.use('/api', require('./modules/amad'));
app.use('/api', require('./modules/storage'));
app.use('/api', require('./modules/notification'));
app.use('/api', require('./modules/cron'));
app.use('/api', require('./modules/dispatch'));
app.use('/api', require('./modules/payment'));
app.use('/api', require('./modules/user-role'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
