const weatherService = require('./weather.service');

async function getWeather(req, res) {
  const city = req.query.city || 'Tundla';
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey || apiKey === 'your_weather_api_key_here') {
    return res.status(503).json({
      success: false,
      error: 'Weather API key not configured on backend.'
    });
  }

  try {
    const weatherData = await weatherService.fetchWeatherFromApi(apiKey, city);
    return res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    console.error(`[Weather Controller] Weather API proxy failed: ${error.message}`);
    return res.status(502).json({
      success: false,
      error: 'Failed to retrieve weather from upstream provider.'
    });
  }
}

module.exports = { getWeather };
