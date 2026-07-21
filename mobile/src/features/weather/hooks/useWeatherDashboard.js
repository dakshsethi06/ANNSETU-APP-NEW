import { useState, useEffect } from 'react';
import { fetchWeather } from '../services/weatherService';

export function useWeatherDashboard(initialCity = 'Agra') {
  const [city, setCity] = useState(initialCity);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(null);

  useEffect(() => {
    handleFetchWeather(initialCity);
  }, []);

  const handleFetchWeather = async (searchCity = city) => {
    if (!searchCity.trim()) {
      setWeatherError('Please enter a district or city name.');
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await fetchWeather(searchCity);
      setWeatherData(data);
    } catch (err) {
      setWeatherError(err.message);
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  return {
    city, setCity, weatherLoading, weatherData, weatherError, handleFetchWeather
  };
}
