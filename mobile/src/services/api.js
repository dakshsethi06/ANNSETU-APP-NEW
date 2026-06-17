// =============================================
// Annsetu — API Service
// Calls the Government Mandi API directly
// No backend server needed!
// =============================================

const API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = '579b464db66ec23bdd0000011eca722018e9429560514de390d5bb1e';

/**
 * Fetches potato mandi prices for Uttar Pradesh directly from data.gov.in
 * Returns { minPrice, maxPrice }
 */
export async function fetchMandiPrices() {
  try {
    const url = `${API_URL}?api-key=${API_KEY}&format=json&limit=10&filters[commodity]=Potato&filters[state]=Uttar Pradesh`;

    const response = await fetch(url);
    const data = await response.json();

    const records = data?.records;

    if (!records || records.length === 0) {
      throw new Error('No mandi price data found.');
    }

    // Get all min and max prices from the records
    const minPrices = [];
    const maxPrices = [];

    for (const r of records) {
      const minVal = parseFloat(r.min_price || r.Min_Price || 0);
      const maxVal = parseFloat(r.max_price || r.Max_Price || 0);
      if (minVal > 0) minPrices.push(minVal);
      if (maxVal > 0) maxPrices.push(maxVal);
    }

    if (minPrices.length === 0 && maxPrices.length === 0) {
      throw new Error('Could not read prices from the data.');
    }

    return {
      minPrice: Math.min(...minPrices),
      maxPrice: Math.max(...maxPrices),
    };
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('No internet connection. Please check your network.');
    }
    throw err;
  }
}

