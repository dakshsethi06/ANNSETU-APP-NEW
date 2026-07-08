import { BACKEND_URL, USE_BACKEND } from '../../../core/network/config';

/**
 * Fetches live mandi prices for a specific state, commodity, and market city.
 * Requests from backend proxy, and falls back to mock data if the backend is unavailable.
 */
export async function fetchMandiPrices(state = 'Uttar Pradesh', commodity = 'All', market = '') {
  // Option A: Try to fetch from local backend
  if (USE_BACKEND) {
    try {
      const url = `${BACKEND_URL}/api/mandi-prices?state=${encodeURIComponent(state)}&commodity=${encodeURIComponent(commodity)}&market=${encodeURIComponent(market)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout limit for backend connection

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.success) {
          return {
            minPrice: data.summary.minPrice,
            maxPrice: data.summary.maxPrice,
            records: data.records || [],
          };
        }
      }
    } catch (err) {
      console.log('Mobile client: Backend fetch failed/timed out, returning mock fallback:', err.message);
    }
  }

  // Fallback Mock Mandi Rates when backend is down/unavailable
  try {
    console.warn('Direct Government API query failed, returning mock fallback data:', err.message);
    
    // Fallback Mock Mandi Rates
    const mockMandiRecords = [
      { commodity: "Potato", market: "Agra", state: "Uttar Pradesh", minPrice: 750, maxPrice: 900, modalPrice: 820, variety: "Pukhraj", arrivalDate: "Today" },
      { commodity: "Potato", market: "Firozabad", state: "Uttar Pradesh", minPrice: 800, maxPrice: 950, modalPrice: 870, variety: "Chipsona", arrivalDate: "Today" },
      { commodity: "Potato", market: "Tundla", state: "Uttar Pradesh", minPrice: 780, maxPrice: 920, modalPrice: 850, variety: "Desi", arrivalDate: "Today" },
      { commodity: "Onion", market: "Agra", state: "Uttar Pradesh", minPrice: 1200, maxPrice: 1500, modalPrice: 1350, variety: "Red", arrivalDate: "Today" },
      { commodity: "Garlic", market: "Agra", state: "Uttar Pradesh", minPrice: 8000, maxPrice: 10000, modalPrice: 9000, variety: "Desi", arrivalDate: "Today" },
      { commodity: "Tomato", market: "Jaipur", state: "Rajasthan", minPrice: 1500, maxPrice: 2000, modalPrice: 1800, variety: "Hybrid", arrivalDate: "Today" },
      { commodity: "Bajra", market: "Alwar", state: "Rajasthan", minPrice: 2100, maxPrice: 2350, modalPrice: 2250, variety: "Desi", arrivalDate: "Today" },
      { commodity: "Wheat", market: "Jaipur", state: "Rajasthan", minPrice: 2400, maxPrice: 2600, modalPrice: 2500, variety: "Lokwan", arrivalDate: "Today" },
      { commodity: "Wheat", market: "Agra", state: "Uttar Pradesh", minPrice: 2350, maxPrice: 2550, modalPrice: 2450, variety: "Dara", arrivalDate: "Today" },
      { commodity: "Mustard", market: "Kota", state: "Rajasthan", minPrice: 5200, maxPrice: 5600, modalPrice: 5400, variety: "Mustard Seed", arrivalDate: "Today" }
    ];

    let filtered = mockMandiRecords;
    if (state && state !== 'All') {
      filtered = filtered.filter(r => r.state.toLowerCase() === state.toLowerCase());
    }
    if (commodity && commodity !== 'All') {
      filtered = filtered.filter(r => r.commodity.toLowerCase().includes(commodity.toLowerCase()));
    }
    if (market && market !== 'All') {
      filtered = filtered.filter(r => r.market.toLowerCase().includes(market.toLowerCase()));
    }

    const minPrices = filtered.map(p => p.minPrice);
    const maxPrices = filtered.map(p => p.maxPrice);

    return {
      minPrice: minPrices.length > 0 ? Math.min(...minPrices) : 750,
      maxPrice: maxPrices.length > 0 ? Math.max(...maxPrices) : 10000,
      records: filtered,
    };
  }
}
