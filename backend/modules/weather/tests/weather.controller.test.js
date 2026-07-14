const weatherController = require('../weather.controller');
const weatherService = require('../weather.service');

jest.mock('../weather.service');

describe('weather.controller unit tests', () => {
  let req, res, spyStatus, spyJson;

  beforeEach(() => {
    jest.clearAllMocks();
    spyStatus = jest.fn().mockReturnThis();
    spyJson = jest.fn();
    res = {
      status: spyStatus,
      json: spyJson
    };
    process.env.WEATHER_API_KEY = 'configured_valid_key';
  });

  test('returns 200 and calls weatherService on success', async () => {
    req = { query: { city: 'Agra' } };
    const mockData = { temp: 30 };
    weatherService.fetchWeatherFromApi.mockResolvedValueOnce(mockData);

    await weatherController.getWeather(req, res);

    expect(weatherService.fetchWeatherFromApi).toHaveBeenCalledWith('configured_valid_key', 'Agra');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
  });

  test('falls back to city Tundla when query city parameter is omitted', async () => {
    req = { query: {} };
    weatherService.fetchWeatherFromApi.mockResolvedValueOnce({ temp: 32 });

    await weatherController.getWeather(req, res);

    expect(weatherService.fetchWeatherFromApi).toHaveBeenCalledWith('configured_valid_key', 'Tundla');
  });

  test('returns mock weather forecast details when API key is missing', async () => {
    process.env.WEATHER_API_KEY = '';
    req = { query: { city: 'Tundla' } };
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await weatherController.getWeather(req, res);

    expect(weatherService.fetchWeatherFromApi).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        location: 'Tundla, Uttar Pradesh',
        temp: 32
      })
    }));
    expect(spyWarn).toHaveBeenCalled();
    spyWarn.mockRestore();
  });

  test('returns mock weather forecast details when API key is the placeholder value', async () => {
    process.env.WEATHER_API_KEY = 'your_weather_api_key_here';
    req = { query: { city: 'Tundla' } };
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await weatherController.getWeather(req, res);

    expect(res.json).toHaveBeenCalled();
    spyWarn.mockRestore();
  });

  test('returns mock fallback weather details when weatherService.fetchWeatherFromApi throws an error', async () => {
    req = { query: { city: 'Agra' } };
    weatherService.fetchWeatherFromApi.mockRejectedValueOnce(new Error('Fetch failed'));
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await weatherController.getWeather(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        location: 'Agra, Uttar Pradesh'
      })
    }));
    expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining('Weather API proxy failed, returning mock fallback data: Fetch failed'));
    spyWarn.mockRestore();
  });
});
