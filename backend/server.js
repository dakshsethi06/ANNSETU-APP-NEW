const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Government Mandi Price API endpoint (can be overridden by MANDI_API_URL in environment)
const MANDI_API_URL = process.env.MANDI_API_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

app.get('/api/mandi-prices', async (req, res) => {
  try {
    const apiKey = process.env.MANDI_API_KEY;
    const isMock = process.env.USE_MOCK_SERVER === 'true';
    const state = req.query.state || 'Uttar Pradesh';
    const commodity = req.query.commodity || 'Potato';

    if (!apiKey && !isMock) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured. Please set MANDI_API_KEY in .env file.',
      });
    }

    console.log(`[Server 1 Gateway] Routing request to: ${MANDI_API_URL} (State: ${state}, Commodity: ${commodity})`);

    const response = await axios.get(MANDI_API_URL, {
      params: {
        'api-key': apiKey || 'mock_key',
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

// Proxy farmers endpoints to Server 2 Mock Server
app.get('/api/farmers', async (req, res) => {
  try {
    const mockUrl = process.env.MANDI_API_URL ? process.env.MANDI_API_URL.replace('/api/v1/mandi-prices', '/api/v1/farmers') : 'http://localhost:3002/api/v1/farmers';
    const response = await axios.get(mockUrl, {
      params: req.query
    });
    res.json(response.data);
  } catch (error) {
    console.error('Proxy farmers GET error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch farmers from mock registry' });
  }
});

app.post('/api/farmers', async (req, res) => {
  try {
    const mockUrl = process.env.MANDI_API_URL ? process.env.MANDI_API_URL.replace('/api/v1/mandi-prices', '/api/v1/farmers') : 'http://localhost:3002/api/v1/farmers';
    const response = await axios.post(mockUrl, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy farmers POST error:', error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { success: false, error: 'Failed to register farmer' });
  }
});

// Proxy holdings endpoints to Server 2 Mock Server
app.get('/api/holdings', async (req, res) => {
  try {
    const mockUrl = process.env.MANDI_API_URL ? process.env.MANDI_API_URL.replace('/api/v1/mandi-prices', '/api/v1/holdings') : 'http://localhost:3002/api/v1/holdings';
    const response = await axios.get(mockUrl, {
      params: req.query
    });
    res.json(response.data);
  } catch (error) {
    console.error('Proxy holdings GET error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch holdings from mock database' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
