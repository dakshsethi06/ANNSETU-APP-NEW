const axios = require('axios');

const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://api.weatherapi.com/v1/forecast.json';
const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache for weather

async function fetchWeatherFromApi(apiKey, city) {
  const cacheKey = city.toLowerCase().trim();
  const cachedEntry = cache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
    console.log(`[Weather Cache] Cache hit for city: ${cacheKey}`);
    return cachedEntry.data;
  }

  console.log(`[Weather Cache] Cache miss. Fetching fresh data for: ${city}`);

  const response = await axios.get(WEATHER_API_URL, {
    params: {
      key: apiKey,
      q: city,
      days: 5,
      aqi: 'no',
      alerts: 'no'
    },
    timeout: 10000
  });

  const data = response.data;
  if (!data) {
    throw new Error('Empty response from Weather API');
  }

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

  const parsedWeather = {
    temp: data.current?.temp_c != null ? Math.round(data.current.temp_c) : null,
    description: data.current?.condition?.text || 'Clear',
    mainCondition: data.current?.condition?.text || 'Clear',
    humidity: data.current?.humidity || 0,
    windSpeed: data.current?.wind_kph != null ? Math.round(data.current.wind_kph) : 0,
    location: locationName,
    forecast: forecastDays,
  };

  cache.set(cacheKey, { data: parsedWeather, timestamp: Date.now() });
  return parsedWeather;
}

module.exports = { fetchWeatherFromApi };
