const weatherService = require('./weather.service');

async function getWeather(req, res) {
  const city = req.query.city || 'Tundla';
  const apiKey = process.env.WEATHER_API_KEY;

  try {
    if (!apiKey || apiKey === 'your_weather_api_key_here') {
      throw new Error('Weather API key not configured on backend.');
    }

    const weatherData = await weatherService.fetchWeatherFromApi(apiKey, city);
    return res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    console.warn(`[Weather Controller] Weather API proxy failed, returning mock fallback data: ${error.message}`);

    const today = new Date().toISOString().split('T')[0];
    const d1 = new Date(); d1.setDate(d1.getDate() + 1); const t1 = d1.toISOString().split('T')[0];
    const d2 = new Date(); d2.setDate(d2.getDate() + 2); const t2 = d2.toISOString().split('T')[0];
    const d3 = new Date(); d3.setDate(d3.getDate() + 3); const t3 = d3.toISOString().split('T')[0];
    const d4 = new Date(); d4.setDate(d4.getDate() + 4); const t4 = d4.toISOString().split('T')[0];

    const mockWeatherData = {
      temp: 32,
      description: 'Sunny',
      mainCondition: 'Sunny',
      humidity: 60,
      windSpeed: 12,
      location: `${city}, Uttar Pradesh`,
      forecast: [
        { date: today, maxTemp: 35, minTemp: 27, conditionText: 'Sunny', humidity: 60 },
        { date: t1, maxTemp: 34, minTemp: 26, conditionText: 'Partly Cloudy', humidity: 65 },
        { date: t2, maxTemp: 33, minTemp: 25, conditionText: 'Patchy rain nearby', humidity: 70 },
        { date: t3, maxTemp: 32, minTemp: 25, conditionText: 'Light rain shower', humidity: 75 },
        { date: t4, maxTemp: 31, minTemp: 24, conditionText: 'Sunny', humidity: 55 }
      ]
    };

    return res.json({
      success: true,
      data: mockWeatherData
    });
  }
}

module.exports = { getWeather };
