import { BACKEND_URL } from '../../../core/network/config';

/**
 * Fetches current weather and 5-day forecast for a specific city via backend proxy.
 * Returns temperature, main condition, description, humidity, wind speed, location name, and forecast array.
 */
export async function fetchWeather(city) {
  try {
    const url = `${BACKEND_URL}/api/weather?city=${encodeURIComponent(city)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Could not fetch weather. Please try again.');
    }

    const data = await response.json();
    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to fetch weather data.');
    }

    return data.data;
  } catch (err) {
    if (err.message.includes('Network request failed')) {
      throw new Error('No internet connection. Please check your network.');
    }
    throw err;
  }
}
