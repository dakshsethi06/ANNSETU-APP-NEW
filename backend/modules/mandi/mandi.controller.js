const mandiService = require('./mandi.service');

async function getMandiPrices(req, res) {
  try {
    const apiKey = process.env.MANDI_API_KEY;
    const state = req.query.state || 'Uttar Pradesh';
    const commodity = req.query.commodity || 'All';
    const market = req.query.market || '';
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    if (!apiKey) return res.status(500).json({ success: false, error: 'API key not configured. Please set MANDI_API_KEY in .env file.' });

    const prices = await mandiService.fetchMandiPrices(apiKey, state, commodity, market);

    if (!prices) {
      return res.status(404).json({ success: false, error: 'No mandi price data found from the API.' });
    }

    if (prices.length === 0) {
      return res.status(404).json({ success: false, error: 'Price data could not be parsed from API response.' });
    }

    const overallMin = Math.min(...prices.map((p) => p.minPrice).filter((v) => v > 0));
    const overallMax = Math.max(...prices.map((p) => p.maxPrice).filter((v) => v > 0));

    const paginatedRecords = prices.slice(offset, offset + limit);

    return res.json({
      success: true,
      summary: { minPrice: overallMin, maxPrice: overallMax, totalRecords: prices.length },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(prices.length / limit),
        totalRecords: prices.length
      },
      records: paginatedRecords,
    });

  } catch (error) {
    console.error('Mandi API error:', error.message);
    if (error.code === 'ECONNABORTED') return res.status(504).json({ success: false, error: 'Request timed out. Please try again.' });
    if (error.response?.status === 401 || error.response?.status === 403) return res.status(401).json({ success: false, error: 'Invalid or expired API key.' });
    if (error.response?.status === 429) return res.status(429).json({ success: false, error: 'API rate limit reached. Please wait a moment.' });
    return res.status(500).json({ success: false, error: 'Failed to fetch mandi prices. Please try again later.' });
  }
}

module.exports = { getMandiPrices };
