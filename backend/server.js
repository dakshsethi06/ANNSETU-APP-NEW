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
    let sql = 'SELECT id AS "serial_number", name, state, "primaryCrop" AS commodity FROM "Farmer" WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (state) {
      sql += ` AND state ILIKE $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }
    if (serial_number) {
      sql += ` AND id = $${paramIndex}`;
      params.push(serial_number);
      paramIndex++;
    }
    
    const result = await db.query(sql, params);
    return res.json({ success: true, farmers: result.rows });
  } catch (error) {
    console.error('PostgreSQL farmers GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch farmers from database' });
  }
});

app.post('/api/farmers', async (req, res) => {
  const { serial_number, name, state, commodity } = req.body;
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
        "coldStorageId", "consentGiven"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
      true                            // consentGiven ($16)
    ];
    
    await db.query(sql, params);
    
    const newFarmer = {
      serial_number,
      name,
      state: finalState,
      commodity: finalCommodity
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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
