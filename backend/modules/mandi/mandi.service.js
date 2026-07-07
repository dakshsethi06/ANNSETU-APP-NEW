const axios = require('axios');

const MANDI_API_URL = process.env.MANDI_API_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCacheKey(state, commodity, market) {
  return `${state || 'All'}:${commodity || 'All'}:${market || 'All'}`;
}

async function fetchMandiPrices(apiKey, state, commodity, market) {
  const cacheKey = getCacheKey(state, commodity, market);
  const cachedEntry = cache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
    console.log(`[Mandi Cache] Cache hit for key: ${cacheKey}`);
    return cachedEntry.data;
  }

  console.log(`[Mandi Cache] Cache miss. Fetching fresh data for: ${cacheKey}`);

  const params = {
    'api-key': apiKey,
    format: 'json',
    limit: 1000,
  };

  if (state && state !== 'All') {
    params['filters[state]'] = state;
  }
  
  if (commodity && commodity !== 'All') {
    params['filters[commodity]'] = commodity;
  }

  if (market && market !== 'All') {
    params['filters[market]'] = market;
  }

  const response = await axios.get(MANDI_API_URL, {
    params,
    timeout: 15000,
  });

  const records = response.data?.records;
  if (!records || records.length === 0) {
    cache.set(cacheKey, { data: [], timestamp: Date.now() });
    return [];
  }

  const prices = records.map((r) => ({
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
  })).filter((p) => p.minPrice > 0 || p.maxPrice > 0);

  cache.set(cacheKey, { data: prices, timestamp: Date.now() });
  return prices;
}

module.exports = { fetchMandiPrices };

