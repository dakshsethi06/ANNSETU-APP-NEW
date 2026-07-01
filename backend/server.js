const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', require('./routes/mandi'));
app.use('/api', require('./routes/farmers'));
app.use('/api', require('./routes/amad'));
app.use('/api', require('./routes/storages'));
app.use('/api', require('./routes/notifications'));
app.use('/api', require('./routes/cron'));
app.use('/api', require('./routes/dispatches'));


// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));

// Fetch user role based on phone database registration
const db = require('./db');
app.get('/api/user-role', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone parameter required' });
    }
    const cleanPhone = phone.replace('+91', '').trim();

    // 1. Check ColdStorageOnboarding table
    const csRes = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE phone = $1', [cleanPhone]);
    if (csRes.rows.length > 0) {
      return res.json({ success: true, role: 'ColdStorageFacility' });
    }

    // 2. Check Farmer table
    const farmerRes = await db.query('SELECT id FROM "Farmer" WHERE phone = $1', [cleanPhone]);
    if (farmerRes.rows.length > 0) {
      return res.json({ success: true, role: 'ColdStorage' });
    }

    // 3. Fallback default
    return res.json({ success: true, role: 'ColdStorage' });
  } catch (error) {
    console.error('Error fetching user-role:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
