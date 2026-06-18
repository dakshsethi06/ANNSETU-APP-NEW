const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Government Mandi Price API endpoint
const MANDI_API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

app.get('/api/mandi-prices', async (req, res) => {
  try {
    const apiKey = process.env.MANDI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured. Please set MANDI_API_KEY in .env file.',
      });
    }

    const response = await axios.get(MANDI_API_URL, {
      params: {
        'api-key': apiKey,
        format: 'json',
        limit: 10,
        'filters[commodity]': 'Potato',
        'filters[state]': 'Uttar Pradesh',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));
app.get('/healthcheck', (req, res) => res.json({ status: 'ok', message: 'welcome' }));

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
