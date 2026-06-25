const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Government Mandi Price API endpoint (can be overridden by MANDI_API_URL in environment)
const MANDI_API_URL = process.env.MANDI_API_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

app.get('/api/mandi-prices', async (req, res) => {
  try {
    const apiKey = process.env.MANDI_API_KEY;
    const state = req.query.state || 'Uttar Pradesh';
    const commodity = req.query.commodity || 'Potato';

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured. Please set MANDI_API_KEY in .env file.',
      });
    }

    console.log(`[Server 1 Gateway] Routing request to: ${MANDI_API_URL} (State: ${state}, Commodity: ${commodity})`);

    const response = await axios.get(MANDI_API_URL, {
      params: {
        'api-key': apiKey,
        format: 'json',
        limit: 10,
        'filters[commodity]': commodity,
        'filters[state]': state,
      },
      timeout: 15000,
    });

    const records = response.data?.records;

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No mandi price data found from the API.',
      });
    }

    // Extract all min and max prices from records
    const prices = records
      .map((r) => ({
        commodity: r.commodity || r.Commodity || 'Unknown',
        market: r.market || r.Market || 'Unknown',
        state: r.state || r.State || 'Unknown',
        minPrice: parseFloat(r.min_price || r.Min_Price || r.min || 0),
        maxPrice: parseFloat(r.max_price || r.Max_Price || r.max || 0),
        modalPrice: parseFloat(r.modal_price || r.Modal_Price || r.modal || 0),
        variety: r.variety || r.Variety || '-',
        arrivalDate: r.arrival_date || r.Arrival_Date || '-',
        farmerName: r.farmer_name || null,
        farmerSerial: r.farmer_serial || null,
      }))
      .filter((p) => p.minPrice > 0 || p.maxPrice > 0);

    if (prices.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Price data could not be parsed from API response.',
      });
    }

    // Compute overall min and max across all records
    const overallMin = Math.min(...prices.map((p) => p.minPrice).filter((v) => v > 0));
    const overallMax = Math.max(...prices.map((p) => p.maxPrice).filter((v) => v > 0));

    return res.json({
      success: true,
      summary: {
        minPrice: overallMin,
        maxPrice: overallMax,
        totalRecords: prices.length,
      },
      records: prices,
    });
  } catch (error) {
    console.error('Mandi API error:', error.message);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ success: false, error: 'Request timed out. Please try again.' });
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ success: false, error: 'Invalid or expired API key.' });
    }
    if (error.response?.status === 429) {
      return res.status(429).json({ success: false, error: 'API rate limit reached. Please wait a moment.' });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch mandi prices. Please try again later.',
    });
  }
});

// Farmers endpoints (PostgreSQL integration)
app.get('/api/farmers', async (req, res) => {
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

app.post('/api/farmers', async (req, res) => {
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

// Amad (Crop Arrival) endpoints (PostgreSQL integration)
app.post('/api/amad', async (req, res) => {
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
    
    return res.status(201).json({ success: true, lot: result.rows[0] });
  } catch (error) {
    console.error('PostgreSQL Amad POST error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to register Amad lot in database' });
  }
});

// Holdings endpoints (PostgreSQL integration)
app.get('/api/holdings', async (req, res) => {
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

// Get all registered cold storages
app.get('/api/cold-storages', async (req, res) => {
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

app.post('/api/cold-storages', async (req, res) => {
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
app.get('/api/cold-storage/summary', async (req, res) => {
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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
