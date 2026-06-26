const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { createAppNotification } = require('../lib/notifications');

// POST /api/cron/crop-aging
router.post('/cron/crop-aging', async (req, res) => {
  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  // 1. Timing-Safe Authorization Check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
  }
  
  const token = authHeader.split(' ')[1];
  const cronSecret = process.env.CRON_SECRET || 'mandi_cron_secret';
  
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest();
    const secretHash = crypto.createHash('sha256').update(cronSecret).digest();
    
    if (!crypto.timingSafeEqual(tokenHash, secretHash)) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Timing check failed' });
  }

  try {
    const now = new Date();
    // Get calendar date in IST to prevent duplicate daily alerts (format: YYYY-MM-DD)
    const alertDateIst = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });

    // 2. Fetch approved cold storage facilities
    const facilitiesRes = await db.query(
      `SELECT id, "displayName" FROM "ColdStorageOnboarding" WHERE status = 'APPROVED'`
    );
    const facilities = facilitiesRes.rows;
    console.log(`[Cron] Processing ${facilities.length} active cold storages...`);

    let totalAlertsCreated = 0;

    // Process facilities
    for (const facility of facilities) {
      // Query active lots stored in this facility
      const lotsRes = await db.query(
        `SELECT id, "farmerId", commodity AS crop, packets AS bags, "availablePackets", "amadDate"
         FROM "AmadLot"
         WHERE "coldStorageId" = $1 AND "availablePackets" > 0`,
        [facility.id]
      );

      console.log(`[Cron] Cold Storage ${facility.displayName} has ${lotsRes.rows.length} active lots.`);

      for (const lot of lotsRes.rows) {
        const amadDate = new Date(lot.amadDate);
        const diffTime = Math.abs(now - amadDate);
        const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;

        // Threshold classification: warning (>= 61 days), aging (>= 91 days)
        if (ageDays >= 61) {
          const type = ageDays >= 91 ? 'aging' : 'warning';
          const severityText = type === 'aging' ? 'Aging Alert' : 'Crop Warning';
          const icon = type === 'aging' ? 'alert-triangle' : 'info';
          const message = `Your stock ${lot.id.substring(0, 8).toUpperCase()} (${lot.crop}, ${lot.availablePackets} bags) has been stored for ${ageDays} days. Please arrange sale.`;

          // Call helper (handles db-level idempotency by catching unique violations)
          const result = await createAppNotification({
            coldStorageId: facility.id,
            userId: lot.farmerId,
            lotId: lot.id,
            type,
            title: severityText,
            message,
            icon,
            actionUrl: `/inventory`,
            alertDate: alertDateIst
          });

          if (result) totalAlertsCreated++;
        }
      }
    }

    return res.json({ 
      success: true, 
      message: 'Crop aging alerts evaluation completed successfully.', 
      alertsCreated: totalAlertsCreated,
      date: alertDateIst
    });
  } catch (error) {
    console.error('Crop aging cron error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error during crop aging alerts run' });
  }
});

module.exports = router;
