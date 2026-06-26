const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all registered cold storages
router.get('/cold-storages', async (req, res) => {
  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  try {
    const result = await db.query(
      'SELECT id, "displayName" AS name, city, district, state FROM "ColdStorageOnboarding" ORDER BY "displayName" ASC'
    );
    return res.json({ success: true, coldStorages: result.rows });
  } catch (error) {
    console.error('PostgreSQL cold-storages GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch cold storages from database' });
  }
});

router.post('/cold-storages', async (req, res) => {
  const { id, displayName, city, district, state, address, contactPerson, phone } = req.body;
  if (!id || !displayName) {
    return res.status(400).json({ success: false, error: 'id and displayName are required fields' });
  }

  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  try {
    const finalCity = city || 'Tundla';
    const finalDistrict = district || 'Firozabad';
    const finalState = state || 'Uttar Pradesh';
    const finalAddress = address || `${finalCity}, ${finalDistrict}`;
    const now = new Date();
    
    const storageCode = 'CS-' + id.substring(0, 6).toUpperCase();

    const sql = `
      INSERT INTO "ColdStorageOnboarding" (
        "id", "storageCode", "legalName", "displayName", "contactPerson",
        "phone", "email", "city", "district", "state", "address",
        "capacityQtl", "roomCount", "status", "requestedAt", "approvedAt",
        "createdAt", "updatedAt", "consentGiven", "consentDate", "consentPurpose", "consentVersion"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `;
    const params = [
      id,                             // id ($1)
      storageCode,                    // storageCode ($2)
      displayName,                    // legalName ($3)
      displayName,                    // displayName ($4)
      contactPerson || 'Manager',     // contactPerson ($5)
      phone || '9999999999',          // phone ($6)
      'contact@' + id + '.com',       // email ($7)
      finalCity,                      // city ($8)
      finalDistrict,                  // district ($9)
      finalState,                     // state ($10)
      finalAddress,                   // address ($11)
      5000.0,                         // capacityQtl ($12)
      10,                             // roomCount ($13)
      'APPROVED',                     // status ($14)
      now,                            // requestedAt ($15)
      now,                            // approvedAt ($16)
      now,                            // createdAt ($17)
      now,                            // updatedAt ($18)
      true,                           // consentGiven ($19)
      now,                            // consentDate ($20)
      'Onboarding Consent',           // consentPurpose ($21)
      'v1.0'                          // consentVersion ($22)
    ];
    
    await db.query(sql, params);
    
    const newStorage = {
      id,
      name: displayName,
      city: finalCity,
      district: finalDistrict,
      state: finalState,
      address: finalAddress
    };
    return res.status(201).json({ success: true, coldStorage: newStorage });
  } catch (error) {
    console.error('PostgreSQL cold-storage POST error:', error.message);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: `Cold Storage with ID ${id} already exists` });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to register cold storage in database' });
  }
});

// Cold Storage Summary (PostgreSQL integration)
router.get('/cold-storage/summary', async (req, res) => {
  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  try {
    const coldStorageId = req.query.coldStorageId || 'cmmp9txv0000ai3t4wush9trs';

    // 1. Get Cold Storage Details
    const csRes = await db.query(
      'SELECT id, "displayName", city, district, state, address FROM "ColdStorageOnboarding" WHERE id = $1',
      [coldStorageId]
    );

    if (csRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cold storage not found.' });
    }

    const cs = csRes.rows[0];

    // 2. Get Total Stock
    const stockRes = await db.query(
      'SELECT SUM("availablePackets") as active_packets, SUM("availableWeightQtl") as active_weight, SUM(packets) as total_packets, SUM("weightQtl") as total_weight FROM "AmadLot" WHERE "coldStorageId" = $1',
      [coldStorageId]
    );
    const stock = stockRes.rows[0];

    // 3. Get Pending Dues
    const duesRes = await db.query(
      'SELECT SUM("balanceDueAmount") as total_dues, COUNT(DISTINCT "farmerId") as farmers_count FROM "NikasiTransaction" WHERE "coldStorageId" = $1 AND "balanceDueAmount" > 0',
      [coldStorageId]
    );
    const dues = duesRes.rows[0];

    // 4. Get Today's Amad
    const todayRes = await db.query(
      'SELECT COUNT(*) as entries_count, SUM(packets) as packets_count FROM "AmadLot" WHERE "coldStorageId" = $1 AND DATE("amadDate") = CURRENT_DATE',
      [coldStorageId]
    );
    const today = todayRes.rows[0];

    // 5. Get Recent Activity (latest Amad Lots)
    const activityRes = await db.query(
      `SELECT id, commodity, kism, "roomId", "rackId", packets, "weightQtl", "goodsCondition" as status, "amadDate" 
       FROM "AmadLot" 
       WHERE "coldStorageId" = $1 
       ORDER BY "amadDate" DESC 
       LIMIT 5`,
      [coldStorageId]
    );

    return res.json({
      success: true,
      summary: {
        coldStorage: {
          id: cs.id,
          name: cs.displayName,
          location: `${cs.city}, ${cs.district}, ${cs.state}`,
          city: cs.city,
          district: cs.district,
          state: cs.state
        },
        stock: {
          packets: parseInt(stock.active_packets || 0, 10),
          weightMt: parseFloat(stock.active_weight || 0) * 0.1,
          totalPackets: parseInt(stock.total_packets || 0, 10),
          totalWeightMt: parseFloat(stock.total_weight || 0) * 0.1
        },
        dues: {
          amount: parseFloat(dues.total_dues || 0),
          farmersCount: parseInt(dues.farmers_count || 0, 10)
        },
        todayAmad: {
          entries: parseInt(today.entries_count || 0, 10),
          packets: parseInt(today.packets_count || 0, 10)
        },
        recentActivity: activityRes.rows.map(row => {
          const amadDate = new Date(row.amadDate);
          const diffTime = Math.abs(new Date() - amadDate);
          const age_days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;
          return {
            id: row.id,
            commodity: row.commodity,
            variety: row.kism || '-',
            room: row.roomId || '-',
            rack: row.rackId || '-',
            bags: row.packets,
            weightMt: parseFloat(row.weightQtl || 0) * 0.1,
            ageDays: age_days,
            status: row.status || 'Good'
          };
        })
      }
    });
  } catch (error) {
    console.error('PostgreSQL cold-storage summary GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch cold storage summary' });
  }
});

module.exports = router;
