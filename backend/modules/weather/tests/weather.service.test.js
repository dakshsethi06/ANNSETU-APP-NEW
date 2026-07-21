let axios;
let weatherService;

describe('weather.service unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.doMock('axios', () => ({
      get: jest.fn()
    }));
    axios = require('axios');
    weatherService = require('../weather.service');
  });

  test('calls axios.get and returns formatted weather forecast data on cache miss', async () => {
    const mockWeatherResponse = {
      data: {
        location: { name: 'Tundla', region: 'Uttar Pradesh' },
        current: { temp_c: 30.4, condition: { text: 'Sunny' }, humidity: 55, wind_kph: 15.2 },
        forecast: {
          forecastday: [
            {
              date: '2026-07-14',
              day: { maxtemp_c: 32.1, mintemp_c: 25.8, condition: { text: 'Sunny' }, avghumidity: 50 }
            }
          ]
        }
      }
    };
    axios.get.mockResolvedValueOnce(mockWeatherResponse);

    const result = await weatherService.fetchWeatherFromApi('test_key', 'Tundla');

    expect(axios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: { key: 'test_key', q: 'Tundla', days: 5, aqi: 'no', alerts: 'no' }
      })
    );
    expect(result).toEqual({
      temp: 30,
      description: 'Sunny',
      mainCondition: 'Sunny',
      humidity: 55,
      windSpeed: 15,
      location: 'Tundla, Uttar Pradesh',
      forecast: [
        { date: '2026-07-14', maxTemp: 32, minTemp: 26, conditionText: 'Sunny', humidity: 50 }
      ]
    });
  });

  test('uses location name only if region is missing or falsy', async () => {
    const mockWeatherResponse = {
      data: {
        location: { name: 'Tundla', region: '' },
        current: { temp_c: null, condition: null, humidity: null, wind_kph: null },
        forecast: {
          forecastday: [
            {
              date: '2026-07-14',
              day: { maxtemp_c: null, mintemp_c: null, condition: null, avghumidity: null }
            }
          ]
        }
      }
    };
    axios.get.mockResolvedValueOnce(mockWeatherResponse);

    const result = await weatherService.fetchWeatherFromApi('test_key', 'Tundla');

    expect(result.location).toBe('Tundla');
    expect(result.temp).toBeNull();
    expect(result.description).toBe('Clear');
    expect(result.forecast[0].maxTemp).toBeNull();
    expect(result.forecast[0].conditionText).toBe('Clear');
  });

  test('falls back to city name if data.location is missing', async () => {
    const mockWeatherResponse = {
      data: {
        current: {},
        forecast: {}
      }
    };
    axios.get.mockResolvedValueOnce(mockWeatherResponse);

    const result = await weatherService.fetchWeatherFromApi('test_key', 'Tundla');

    expect(result.location).toBe('Tundla');
  });

  test('serves weather details from memory cache on cache hits', async () => {
    const mockWeatherResponse = {
      data: {
        location: { name: 'Tundla' },
        current: { temp_c: 28 },
        forecast: { forecastday: [] }
      }
    };
    axios.get.mockResolvedValueOnce(mockWeatherResponse);

    // First call (Cache Miss)
    await weatherService.fetchWeatherFromApi('test_key', 'Tundla');
    expect(axios.get).toHaveBeenCalledTimes(1);

    // Second call (Cache Hit)
    const result = await weatherService.fetchWeatherFromApi('test_key', 'Tundla');
    expect(axios.get).toHaveBeenCalledTimes(1); // Axios count remains 1
    expect(result.temp).toBe(28);
  });

  test('throws error if axios returns an empty response', async () => {
    axios.get.mockResolvedValueOnce({ data: null });

    await expect(weatherService.fetchWeatherFromApi('test_key', 'Tundla'))
      .rejects.toThrow('Empty response from Weather API');
  });
});
