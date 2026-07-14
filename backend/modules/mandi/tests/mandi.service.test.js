const axios = require('axios');
const { fetchMandiPrices } = require('../mandi.service');

// Mock axios
jest.mock('axios');

describe('Mandi Service', () => {
  const API_KEY = 'test_api_key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch data from API on a cache miss and format it correctly', async () => {
    // We use unique parameters to guarantee a cache miss
    const state = 'TestState1';
    const commodity = 'TestComm1';
    const market = 'TestMarket1';

    const mockApiResponse = {
      data: {
        records: [
          {
            commodity: 'Potato',
            market: 'Agra',
            state: 'Uttar Pradesh',
            min_price: '1000',
            max_price: '1500',
            modal_price: '1200',
            variety: 'Desi',
            arrival_date: '2023-10-10'
          },
          {
            // Edge case: empty/zero price
            commodity: 'Tomato',
            min_price: '0',
            max_price: '0'
          }
        ]
      }
    };

    axios.get.mockResolvedValueOnce(mockApiResponse);

    const prices = await fetchMandiPrices(API_KEY, state, commodity, market);

    // Verify axios was called with correct URL and params
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('api.data.gov.in'),
      expect.objectContaining({
        params: {
          'api-key': API_KEY,
          format: 'json',
          limit: 1000,
          'filters[state]': state,
          'filters[commodity]': commodity,
          'filters[market]': market
        },
        timeout: 15000
      })
    );

    // Verify the data was mapped correctly and 0 price items were filtered out
    expect(prices).toHaveLength(1);
    expect(prices[0]).toEqual(expect.objectContaining({
      commodity: 'Potato',
      market: 'Agra',
      state: 'Uttar Pradesh',
      minPrice: 1000,
      maxPrice: 1500,
      modalPrice: 1200,
      variety: 'Desi',
      arrivalDate: '2023-10-10',
    }));
  });

  it('should return cached data on subsequent calls (Cache Hit)', async () => {
    const state = 'TestState2';
    const commodity = 'TestComm2';
    const market = 'TestMarket2';

    const mockApiResponse = {
      data: {
        records: [
          {
            commodity: 'Onion',
            min_price: '500',
            max_price: '800'
          }
        ]
      }
    };

    // Call 1: Cache Miss
    axios.get.mockResolvedValueOnce(mockApiResponse);
    const firstCall = await fetchMandiPrices(API_KEY, state, commodity, market);
    expect(axios.get).toHaveBeenCalledTimes(1);

    // Call 2: Cache Hit
    const secondCall = await fetchMandiPrices(API_KEY, state, commodity, market);
    
    // Axios should NOT be called again
    expect(axios.get).toHaveBeenCalledTimes(1);
    
    // Results should be identical
    expect(secondCall).toEqual(firstCall);
  });

  it('should safely handle empty records from the API', async () => {
    const state = 'TestStateEmpty';
    
    // API returns no records
    axios.get.mockResolvedValueOnce({ data: { records: [] } });

    const prices = await fetchMandiPrices(API_KEY, state, null, null);
    
    expect(prices).toEqual([]);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('should not add filter params if they are "All" or null', async () => {
    const state = 'All';
    const commodity = null;
    const market = 'All';

    axios.get.mockResolvedValueOnce({ data: { records: [] } });

    await fetchMandiPrices(API_KEY, state, commodity, market);

    expect(axios.get).toHaveBeenCalledTimes(1);
    const passedParams = axios.get.mock.calls[0][1].params;
    
    // Ensure filters are NOT in the params object
    expect(passedParams).not.toHaveProperty('filters[state]');
    expect(passedParams).not.toHaveProperty('filters[commodity]');
    expect(passedParams).not.toHaveProperty('filters[market]');
  });

  it('should map fallback and capitalized keys correctly from API response', async () => {
    const mockApiResponse = {
      data: {
        records: [
          {
            Commodity: 'Wheat',
            Market: 'Delhi',
            State: 'NCT',
            Min_Price: '2000',
            Max_Price: '2500',
            Modal_Price: '2200',
            Variety: 'Local',
            Arrival_Date: '2023-11-11'
          },
          {
            // Specifically testing the 3rd OR condition (min, max, modal)
            min: '500',
            max: '600',
            modal: '550'
          },
          {
            // Missing all typical keys to hit 'Unknown', '-', and 0 branches
          },
          {
            // Testing when keys exist but values are null/falsy
            commodity: '',
            min_price: null
          }
        ]
      }
    };

    axios.get.mockResolvedValueOnce(mockApiResponse);

    // Call with unique params to guarantee cache miss
    const prices = await fetchMandiPrices(API_KEY, 'UniqueStateForFallback', null, null);

    expect(prices).toHaveLength(2);
    
    // First record uses Capitalized keys
    expect(prices[0]).toEqual(expect.objectContaining({
      commodity: 'Wheat',
      market: 'Delhi',
      state: 'NCT',
      minPrice: 2000,
      maxPrice: 2500,
      modalPrice: 2200,
      variety: 'Local',
      arrivalDate: '2023-11-11'
    }));

    // Second record uses fallback keys and default strings
    expect(prices[1]).toEqual(expect.objectContaining({
      commodity: 'Unknown',
      market: 'Unknown',
      state: 'Unknown',
      minPrice: 500,
      maxPrice: 600,
      modalPrice: 550,
      variety: '-',
      arrivalDate: '-'
    }));
  });

  it('should generate correct cache keys when only partial parameters are provided to achieve full branch coverage', async () => {
    axios.get.mockResolvedValue({ data: { records: [] } });

    // Test with only state
    await fetchMandiPrices(API_KEY, 'OnlyState', null, null);
    
    // Test with state and commodity, but no market
    await fetchMandiPrices(API_KEY, 'OnlyState', 'OnlyCommodity', null);
    
    // Test with state and market, but no commodity
    await fetchMandiPrices(API_KEY, 'OnlyState', null, 'OnlyMarket');

    expect(axios.get).toHaveBeenCalledTimes(3);
  });
});
