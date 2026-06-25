// =============================================
// Annsetu — API Service
// Calls the Government Mandi API directly or via backend
// =============================================

const USE_BACKEND = true; // Route: App -> Server 1 -> Server 2 -> Server 1 -> App
const BACKEND_URL = 'http://192.168.1.3:3001'; // Configured with local PC IP address

const API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = '579b464db66ec23bdd0000011eca722018e9429560514de390d5bb1e';

// WeatherAPI.com API details
const WEATHER_API_URL = 'https://api.weatherapi.com/v1/forecast.json';
const WEATHER_API_KEY = 'cc98b5f11d594fa893f52703261806'; // User's WeatherAPI.com API Key

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

    const parsedRecords = records.map((r, idx) => ({
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

/**
 * Fetches current weather and 5-day forecast for a specific city.
 * Returns temperature, main condition, description, humidity, wind speed, location name, and forecast array.
 */
export async function fetchWeather(city) {
  try {
    if (!WEATHER_API_KEY || WEATHER_API_KEY === 'YOUR_WEATHERAPI_KEY') {
      throw new Error('Weather API key not configured. Please add your key in mobile/src/services/api.js.');
    }

    const url = `${WEATHER_API_URL}?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&days=5&aqi=no&alerts=no`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error(`Location "${city}" not found.`);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid weather API key. Please check your WeatherAPI.com key.');
      }
      throw new Error('Could not fetch weather. Please try again.');
    }

    const data = await response.json();

    const locationName = data.location?.region
      ? `${data.location.name}, ${data.location.region}`
      : (data.location?.name || city);

    const forecastDays = data.forecast?.forecastday?.map((dayItem) => ({
      date: dayItem.date,
      maxTemp: dayItem.day?.maxtemp_c != null ? Math.round(dayItem.day.maxtemp_c) : null,
      minTemp: dayItem.day?.mintemp_c != null ? Math.round(dayItem.day.mintemp_c) : null,
      conditionText: dayItem.day?.condition?.text || 'Clear',
      humidity: dayItem.day?.avghumidity || 0,
    })) || [];

    return {
      temp: data.current?.temp_c != null ? Math.round(data.current.temp_c) : null,
      description: data.current?.condition?.text || 'Clear',
      mainCondition: data.current?.condition?.text || 'Clear',
      humidity: data.current?.humidity || 0,
      windSpeed: data.current?.wind_kph != null ? Math.round(data.current.wind_kph) : 0,
      location: locationName,
      forecast: forecastDays,
    };
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('No internet connection. Please check your network.');
    }
    throw err;
  }
}

/**
 * Fetches the list of Indian states for Mandi price lookups.
 * Returns an array of standard states.
 */
export async function fetchStates() {
  return [
    'Andhra Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal'
  ];
}

/**
 * Fetches the list of farmers, optionally filtered by state and/or serial number.
 */
export async function fetchFarmers(state = '', serialNumber = '') {
  try {
    let url = `${BACKEND_URL}/api/farmers?`;
    if (state) url += `state=${encodeURIComponent(state)}&`;
    if (serialNumber) url += `serial_number=${encodeURIComponent(serialNumber)}&`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch farmers');
    }
    return data.farmers;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Registers a new farmer in the database.
 */
export async function addFarmer(farmerData) {
  try {
    const url = `${BACKEND_URL}/api/farmers`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(farmerData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add farmer');
    }
    return data.farmer;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Adds a new Amad lot to the database.
 */
export async function addAmad(amadData) {
  try {
    const url = `${BACKEND_URL}/api/amad`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(amadData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add Amad lot');
    }
    return data.lot;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Fetches cold storage holdings.
 */
export async function fetchHoldings() {
  try {
    const url = `${BACKEND_URL}/api/holdings`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch holdings');
    }
    return data.holdings;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Fetches cold storage summary metrics and recent activity.
 */
export async function fetchColdStorageSummary(coldStorageId = 'cmmp9txv0000ai3t4wush9trs') {
  try {
    const url = `${BACKEND_URL}/api/cold-storage/summary?coldStorageId=${encodeURIComponent(coldStorageId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch cold storage summary');
    }
    return data.summary;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Fetches the list of all registered cold storages.
 */
export async function fetchColdStorages() {
  try {
    const url = `${BACKEND_URL}/api/cold-storages`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch cold storages');
    }
    return data.coldStorages;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}

/**
 * Registers a new cold storage in the database.
 */
export async function addColdStorage(csData) {
  try {
    const url = `${BACKEND_URL}/api/cold-storages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(csData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add cold storage');
    }
    return data.coldStorage;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('Could not connect to backend server. Please verify if it is running.');
    }
    throw err;
  }
}
