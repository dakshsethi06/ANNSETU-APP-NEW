const { getMandiPrices } = require('./mandi.controller');
const mandiService = require('./mandi.service');

// Mock the service
jest.mock('./mandi.service');

describe('Mandi Controller', () => {
  let req, res;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env = { ...originalEnv };
    process.env.MANDI_API_KEY = 'test_key';

    req = {
      query: {
        state: 'Uttar Pradesh',
        commodity: 'Potato',
        market: 'Agra',
        page: '1',
        limit: '10'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 500 if API key is missing', async () => {
    delete process.env.MANDI_API_KEY;

    await getMandiPrices(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('API key not configured')
      })
    );
  });

  it('should successfully return paginated records', async () => {
    const mockPrices = [
      { minPrice: 100, maxPrice: 200 },
      { minPrice: 150, maxPrice: 250 }
    ];
    mandiService.fetchMandiPrices.mockResolvedValue(mockPrices);

    await getMandiPrices(req, res);

    expect(mandiService.fetchMandiPrices).toHaveBeenCalledWith('test_key', 'Uttar Pradesh', 'Potato', 'Agra');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        summary: { minPrice: 100, maxPrice: 250, totalRecords: 2 },
        pagination: expect.objectContaining({ page: 1, limit: 10, totalPages: 1 }),
        records: mockPrices
      })
    );
  });

  it('should return 404 if no prices found', async () => {
    mandiService.fetchMandiPrices.mockResolvedValue(null);

    await getMandiPrices(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'No mandi price data found from the API.' });
  });

  it('should return 404 if empty array returned', async () => {
    mandiService.fetchMandiPrices.mockResolvedValue([]);

    await getMandiPrices(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Price data could not be parsed from API response.' });
  });

  it('should fallback to mock data if service throws an error', async () => {
    // Force the service to throw an error
    mandiService.fetchMandiPrices.mockRejectedValue(new Error('API Timeout'));

    // Test with specific query that matches our mock data
    req.query.commodity = 'Potato';
    req.query.state = 'Uttar Pradesh';
    req.query.market = 'Agra';

    await getMandiPrices(req, res);

    // Should NOT call res.status(500)
    expect(res.status).not.toHaveBeenCalled();
    
    // Should return success with the fallback data filtered properly
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        records: expect.arrayContaining([
          expect.objectContaining({ commodity: 'Potato', market: 'Agra' })
        ])
      })
    );
  });

  it('should use default query parameters if none are provided', async () => {
    req.query = {}; // Empty query string
    const mockPrices = [{ minPrice: 100, maxPrice: 200 }];
    mandiService.fetchMandiPrices.mockResolvedValue(mockPrices);

    await getMandiPrices(req, res);

    expect(mandiService.fetchMandiPrices).toHaveBeenCalledWith('test_key', 'Uttar Pradesh', 'All', '');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({ page: 1, limit: 10 })
      })
    );
  });

  it('should handle fallback filtering when NO records match to test default summary bounds', async () => {
    mandiService.fetchMandiPrices.mockRejectedValue(new Error('API Timeout'));
    
    // Provide query parameters that definitely do not match the mock static data
    req.query.commodity = 'AlienFruit';
    req.query.state = 'Mars';
    req.query.market = 'Crater Market';

    await getMandiPrices(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        summary: expect.objectContaining({ minPrice: 750, maxPrice: 10000, totalRecords: 0 }),
        records: []
      })
    );
  });

  it('should handle fallback filtering when query parameters are empty to bypass filter branches', async () => {
    mandiService.fetchMandiPrices.mockRejectedValue(new Error('API Error'));
    req.query = { state: 'All', commodity: 'All', market: 'All' };
    
    await getMandiPrices(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        records: expect.any(Array) // Should return the full mock array
      })
    );
  });
});
