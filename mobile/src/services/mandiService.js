import { BACKEND_URL, USE_BACKEND, API_URL, API_KEY } from './config';

/**
 * Fetches potato mandi prices for a specific state
 * Returns { minPrice, maxPrice }
 */
export async function fetchMandiPrices(state = 'Uttar Pradesh', commodity = 'Potato') {
  try {
    if (USE_BACKEND) {
      const url = `${BACKEND_URL}/api/mandi-prices?state=${encodeURIComponent(state)}&commodity=${encodeURIComponent(commodity)}`;
      const response = await fetch(url);

      if (!response.ok) {
        let errMsg = `Backend server returned status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch mandi prices from backend');
      }

      return {
        minPrice: data.summary.minPrice,
        maxPrice: data.summary.maxPrice,
        records: data.records,
      };
    }

    const url = `${API_URL}?api-key=${API_KEY}&format=json&limit=10&filters[commodity]=${encodeURIComponent(commodity)}&filters[state]=${encodeURIComponent(state)}`;

    const response = await fetch(url);
    const data = await response.json();

    const records = data?.records;

    if (!records || records.length === 0) {
      throw new Error(`No mandi price data found for ${state}.`);
    }

    const parsedRecords = records.map((r) => ({
      commodity: r.commodity || r.Commodity || 'Unknown',
      market: r.market || r.Market || 'Unknown',
      state: r.state || r.State || 'Unknown',
      minPrice: parseFloat(r.min_price || r.Min_Price || r.min || 0),
      maxPrice: parseFloat(r.max_price || r.Max_Price || r.max || 0),
      modalPrice: parseFloat(r.modal_price || r.Modal_Price || r.modal || 0),
      variety: r.variety || r.Variety || '-',
      arrivalDate: r.arrival_date || r.Arrival_Date || '-',
      farmerName: r.farmer_name || r.farmerName || 'Unknown',
      farmerSerial: r.farmer_serial || r.farmerSerial || 'N/A',
    })).filter((p) => p.minPrice > 0 || p.maxPrice > 0);

    if (parsedRecords.length === 0) {
      throw new Error('Could not read prices from the data.');
    }

    const minPrices = parsedRecords.map(p => p.minPrice);
    const maxPrices = parsedRecords.map(p => p.maxPrice);

    return {
      minPrice: Math.min(...minPrices),
      maxPrice: Math.max(...maxPrices),
      records: parsedRecords,
    };
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}
