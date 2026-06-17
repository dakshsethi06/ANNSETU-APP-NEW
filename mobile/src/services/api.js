// =============================================
// Annsetu — API Service
// Calls the deployed Railway backend
// =============================================

const BASE_URL = 'https://mandi-info-production.up.railway.app';

/**
 * Fetches potato mandi prices for Uttar Pradesh via the backend
 * Returns { minPrice, maxPrice }
 */
export async function fetchMandiPrices() {
  try {
    const response = await fetch(`${BASE_URL}/api/mandi-prices`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch mandi prices.');
    }

    return {
      minPrice: data.summary.minPrice,
      maxPrice: data.summary.maxPrice,
    };
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('No internet connection. Please check your network.');
    }
    throw err;
  }
}
