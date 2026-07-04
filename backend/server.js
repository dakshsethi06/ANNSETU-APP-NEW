const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', require('./modules/mandi/mandi.routes'));
app.use('/api', require('./modules/farmer/farmer.routes'));
app.use('/api', require('./modules/amad/amad.routes'));
app.use('/api', require('./modules/storage/storage.routes'));
app.use('/api', require('./modules/notification/notification.routes'));
app.use('/api', require('./modules/cron/cron.routes'));
app.use('/api', require('./modules/dispatch/dispatch.routes'));
app.use('/api', require('./modules/payment/payment.routes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));

// Fetch user role based on phone database registration
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

app.post('/api/users/push-token', async (req, res) => {
  const { userId, pushToken } = req.body;
  if (!userId || !pushToken) {
    return res.status(400).json({ success: false, error: 'userId and pushToken are required fields.' });
  }

  try {
    const cleanUserId = userId.replace('+91', '').trim();
    // Resolve farmer phone number to their database ID if needed,
    // so the shadow user created in the "User" table matches the token record.
    let resolvedUserId = cleanUserId;
    const farmerRes = await db.query(
      'SELECT id FROM "Farmer" WHERE phone = $1 OR id = $1 LIMIT 1',
      [cleanUserId]
    );
    if (farmerRes.rows.length > 0) {
      resolvedUserId = farmerRes.rows[0].id;
    }

    // Update or insert shadow user if not exists
    await db.query(
      `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "active", "createdAt", "updatedAt", "coldStorageId", "sessionVersion", "pushToken")
       VALUES ($1, $1, $2, 'dummy_hash', 'OPERATOR', true, NOW(), NOW(), 'cmmp9txv0000ai3t4wush9trs', 1, $3)
       ON CONFLICT (id) DO UPDATE SET "pushToken" = EXCLUDED."pushToken", "updatedAt" = NOW()`,
      [resolvedUserId, `farmer_${resolvedUserId}@annsetu.local`, pushToken]
    );

    console.log(`[Backend] Registered push token for userId ${resolvedUserId}: ${pushToken}`);
    return res.json({ success: true, message: 'Push token registered successfully.' });
  } catch (err) {
    console.error('Error registering push token:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
