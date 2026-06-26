const express = require('express');
const router = express.Router();
const db = require('../db');

// Farmers endpoints (PostgreSQL integration)
router.get('/farmers', async (req, res) => {
  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  try {
    const { state, serial_number } = req.query;
    let sql = `
      SELECT 
        f.id AS "serial_number", 
        f.name, 
        f.state, 
        f."primaryCrop" AS commodity, 
        f."fatherName", 
        f.phone, 
        f.village, 
        f.district, 
        f.tehsil,
        COALESCE(SUM(nt."balanceDueAmount"), 0) AS "pendingRent"
      FROM "Farmer" f
      LEFT JOIN "NikasiTransaction" nt ON nt."farmerId" = f.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (state) {
      sql += ` AND f.state ILIKE $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }
    if (serial_number) {
      sql += ` AND f.id = $${paramIndex}`;
      params.push(serial_number);
      paramIndex++;
    }
    
    sql += ` GROUP BY f.id, f.name, f.state, f."primaryCrop", f."fatherName", f.phone, f.village, f.district, f.tehsil`;
    
    const result = await db.query(sql, params);
    return res.json({ success: true, farmers: result.rows });
  } catch (error) {
    console.error('PostgreSQL farmers GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch farmers from database' });
  }
});

router.post('/farmers', async (req, res) => {
  const { serial_number, name, state, commodity, phone, fatherName, village, district, tehsil } = req.body;
  if (!serial_number || !name) {
    return res.status(400).json({ success: false, error: 'serial_number and name are required fields' });
  }

  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  try {
    const finalState = state || 'Rajasthan';
    const finalCommodity = commodity || 'Potato';
    const now = new Date();
    
    const sql = `
      INSERT INTO "Farmer" (
        "id", "accountNumber", "name", "state", "primaryCrop",
        "isLocalFarmer", "openingBalance", "creditLimit", "interestRate",
        "autoSmsReminder", "joinDate", "active", "createdAt", "updatedAt",
        "coldStorageId", "consentGiven", "phone", "fatherName", "village", "district", "tehsil"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `;
    const params = [
      serial_number,                  // id ($1)
      'CS-' + serial_number,          // accountNumber ($2)
      name,                           // name ($3)
      finalState,                     // state ($4)
      finalCommodity,                 // primaryCrop ($5)
      true,                           // isLocalFarmer ($6)
      0.0,                            // openingBalance ($7)
      10000.0,                        // creditLimit ($8)
      0.0,                            // interestRate ($9)
      false,                          // autoSmsReminder ($10)
      now,                            // joinDate ($11)
      true,                           // active ($12)
      now,                            // createdAt ($13)
      now,                            // updatedAt ($14)
      'cmmp9txv0000ai3t4wush9trs',    // coldStorageId ($15) (SN Sharma Cold Storage ID)
      true,                           // consentGiven ($16)
      phone || null,                  // phone ($17)
      fatherName || null,             // fatherName ($18)
      village || null,                // village ($19)
      district || null,               // district ($20)
      tehsil || null                  // tehsil ($21)
    ];
    
    await db.query(sql, params);
    
    const newFarmer = {
      serial_number,
      name,
      state: finalState,
      commodity: finalCommodity,
      phone: phone || null,
      fatherName: fatherName || null,
      village: village || null,
      district: district || null,
      tehsil: tehsil || null
    };
    return res.status(201).json({ success: true, farmer: newFarmer });
  } catch (error) {
    console.error('PostgreSQL farmers POST error:', error.message);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: `Farmer with serial number ${serial_number} already exists` });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to register farmer in database' });
  }
});

module.exports = router;
