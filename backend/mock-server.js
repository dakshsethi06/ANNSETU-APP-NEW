const express = require('express');
const cors = require('cors');
const dbHelper = require('./db-helper');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Mock database or generator for states
app.get('/api/v1/mandi-prices', (req, res) => {
  const state = (req.query.filters && req.query.filters.state) || req.query['filters[state]'] || 'Uttar Pradesh';
  const commodity = (req.query.filters && req.query.filters.commodity) || req.query['filters[commodity]'] || 'Potato';
  const limit = parseInt(req.query.limit || '10', 10);

  console.log(`[Mock Server 2] Request received: commodity="${commodity}", state="${state}"`);

  // Generate deterministic base prices based on state + commodity name
  const seed = state + ':' + commodity;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const baseVal = Math.abs(hash);
  const basePrice = 800 + (baseVal % 1600); // 800 - 2400 range (varies by commodity)

  // Define some mock markets for the state
  const mockMarkets = [
    `${state} Central Mandi`,
    `${state} District Board Market`,
    `Krishi Upaj Mandi, ${state}`,
    `${state} Vegetable Yard`
  ];

  const varieties = ['Jyoti', 'Desi', 'Local', 'Kufri Bahar', 'Premium'];

  // Read matching farmers from database
  const db = dbHelper.readDb();
  const stateFarmers = (db.farmers || []).filter(f => f.state.toLowerCase() === state.toLowerCase());

  // Construct response records
  const records = [];
  const count = Math.min(limit, 3 + (baseVal % 5)); // 3 to 7 records

  for (let i = 0; i < count; i++) {
    const market = mockMarkets[i % mockMarkets.length];
    const variety = varieties[(baseVal + i) % varieties.length];
    
    // Add minor price variations between markets
    const variance = (i * 75) - 100; // -100 to +350 range
    const min = basePrice + variance;
    const max = min + 300 + (i * 50); // max is always higher
    const modal = Math.round((min + max) / 2);

    // Pick farmer to bind to this record
    let seller = null;
    if (stateFarmers.length > 0) {
      seller = stateFarmers[i % stateFarmers.length];
    } else if (db.farmers && db.farmers.length > 0) {
      seller = db.farmers[i % db.farmers.length];
    }

    records.push({
      commodity: commodity,
      market: market,
      state: state,
      min_price: min.toString(),
      max_price: max.toString(),
      modal_price: modal.toString(),
      variety: variety,
      arrival_date: new Date().toLocaleDateString('en-GB'),
      // Associated farmer details
      farmer_name: seller ? seller.name : 'Unknown',
      farmer_serial: seller ? seller.serial_number : 'N/A'
    });
  }

  // Mimic Government Mandi API Envelope
  res.json({
    success: true,
    title: 'Mandi Prices Mock Resource',
    desc: 'Government Mandi Price Mock Data for local testing',
    updated_date: new Date().toISOString(),
    records: records
  });
});

// Farmers endpoints
app.get('/api/v1/farmers', (req, res) => {
  const db = dbHelper.readDb();
  const state = req.query.state;
  const serialNumber = req.query.serial_number;

  let filtered = db.farmers || [];
  if (state) {
    filtered = filtered.filter(f => f.state.toLowerCase() === state.toLowerCase());
  }
  if (serialNumber) {
    filtered = filtered.filter(f => f.serial_number === serialNumber);
  }

  res.json({ success: true, farmers: filtered });
});

app.post('/api/v1/farmers', (req, res) => {
  const { serial_number, name, state, commodity } = req.body;
  if (!serial_number || !name) {
    return res.status(400).json({ success: false, error: 'serial_number and name are required fields' });
  }

  const db = dbHelper.readDb();
  db.farmers = db.farmers || [];

  if (db.farmers.some(f => f.serial_number === serial_number)) {
    return res.status(400).json({ success: false, error: `Farmer with serial number ${serial_number} already exists` });
  }

  const newFarmer = {
    serial_number,
    name,
    state: state || 'Rajasthan',
    commodity: commodity || 'Potato'
  };

  db.farmers.push(newFarmer);
  dbHelper.writeDb(db);

  res.status(201).json({ success: true, farmer: newFarmer });
});

app.get('/api/v1/holdings', (req, res) => {
  const db = dbHelper.readDb();
  res.json({ success: true, holdings: db.holdings || [] });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Mock API Server' }));

app.listen(PORT, () => {
  console.log(`✅ Mock Server (Server 2) is running on http://localhost:${PORT}`);
});
