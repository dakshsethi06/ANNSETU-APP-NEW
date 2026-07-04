import { WEATHER_API_URL, WEATHER_API_KEY } from '../../../core/network/config';

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
