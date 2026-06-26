const express = require('express');
const router = express.Router();
const db = require('../db');

// Amad (Crop Arrival) endpoints (PostgreSQL integration)
router.post('/amad', async (req, res) => {
  const { farmerId, commodity, kism, roomId, rackId, packets, weightQtl, goodsCondition } = req.body;
  
  if (!farmerId || !commodity || !packets || !weightQtl) {
    return res.status(400).json({ success: false, error: 'farmerId, commodity, packets, and weightQtl are required fields.' });
  }

  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  try {
    const id = 'AM-' + Date.now();
    const now = new Date();
    // Link to the default registered Cold Storage ID
    const coldStorageId = 'cmmp9txv0000ai3t4wush9trs'; 
    
    const sql = `
      INSERT INTO "AmadLot" (
        "id", "farmerId", "coldStorageId", "commodity", "kism", 
        "roomId", "rackId", "packets", "weightQtl", "availablePackets", "availableWeightQtl", "goodsCondition", "amadDate"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const params = [
      id, farmerId, coldStorageId, commodity, kism || null,
      roomId || null, rackId || null, packets, weightQtl, 
      packets, weightQtl, goodsCondition || 'Fresh', now
    ];
    
    const result = await db.query(sql, params);
    const lot = result.rows[0];

    // Trigger Amad booking notifications (outbound SMS log & in-app alert)
    try {
      const { logOutboundNotification, createAppNotification } = require('../lib/notifications');
      
      const farmerRes = await db.query('SELECT name, phone FROM "Farmer" WHERE id = $1', [farmerId]);
      const farmer = farmerRes.rows[0] || { name: 'Farmer', phone: null };

      await logOutboundNotification({
        coldStorageId: coldStorageId,
        channel: 'SMS',
        eventType: 'AMAD_CREATED',
        recipientPhone: farmer.phone,
        recipientName: farmer.name,
        message: `Dear ${farmer.name}, your inward stock booking is confirmed. Lot ID: ${lot.id.toUpperCase()}. Commodity: ${commodity}, Packets: ${packets} bags.`,
        relatedModel: 'AmadLot',
        relatedId: lot.id
      });

      await createAppNotification({
        coldStorageId: coldStorageId,
        userId: farmerId,
        lotId: lot.id,
        type: 'info',
        title: 'New Stock Inward',
        message: `Your stock of ${packets} bags of ${commodity} has been stored successfully in Room ${roomId || '-'}.`,
        icon: 'inbox',
        actionUrl: `/inventory`
      });
    } catch (notifErr) {
      console.warn('Amad booking notifications failed to trigger:', notifErr.message);
    }

    return res.status(201).json({ success: true, lot });
  } catch (error) {
    console.error('PostgreSQL Amad POST error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to register Amad lot in database' });
  }
});

// Holdings endpoints (PostgreSQL integration)
router.get('/holdings', async (req, res) => {
  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  try {
    const sql = `
      SELECT 
        a.id AS lot_id,
        a.commodity AS crop,
        a.kism AS variety,
        c."displayName" AS cold_storage,
        a."roomId" AS location,
        a.packets AS bags,
        a."weightQtl" || ' Qt' AS weight,
        COALESCE(a."goodsCondition", 'Good') AS status,
        a."amadDate",
        a."farmerId" AS id
      FROM "AmadLot" a
      LEFT JOIN "ColdStorageOnboarding" c ON a."coldStorageId" = c.id
    `;
    const result = await db.query(sql);
    
    const holdings = result.rows.map(row => {
      const amadDate = new Date(row.amadDate);
      const diffTime = Math.abs(new Date() - amadDate);
      const age_days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;
      
      return {
        id: row.id, // mapped to id (representing farmer_id) for frontend filtering
        lot_id: row.lot_id,
        crop: row.crop,
        variety: row.variety || '-',
        cold_storage: row.cold_storage || 'Default CS',
        location: row.location || 'Section A',
        bags: row.bags,
        weight: row.weight,
        age_days: age_days,
        inbound_age: `${age_days}d`,
        status: row.status
      };
    });
    
    return res.json({ success: true, holdings });
  } catch (error) {
    console.error('PostgreSQL holdings GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch holdings from database' });
  }
});

module.exports = router;
