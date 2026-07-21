const { processCropAging } = require('../cron.controller');
const cronService = require('../cron.service');
const crypto = require('crypto');

// Mock the service
jest.mock('../cron.service');

describe('Cron Controller', () => {
  let req, res;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = 'mandi_cron_secret';

    req = {
      headers: {
        authorization: 'Bearer mandi_cron_secret'
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

  it('should return 401 if authorization header is missing', async () => {
    req.headers = {};
    await processCropAging(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized: Missing token' });
  });

  it('should return 401 if authorization header is not Bearer', async () => {
    req.headers.authorization = 'Basic mandi_cron_secret';
    await processCropAging(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized: Missing token' });
  });

  it('should return 401 if Bearer token is invalid', async () => {
    req.headers.authorization = 'Bearer invalid_secret';
    await processCropAging(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized: Invalid token' });
  });

  it('should return 401 timing check failure when crypto timing check throws', async () => {
    const timingSafeEqualSpy = jest.spyOn(crypto, 'timingSafeEqual').mockImplementationOnce(() => {
      throw new Error('Fake error');
    });

    await processCropAging(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized: Timing check failed' });
    timingSafeEqualSpy.mockRestore();
  });

  it('should successfully evaluate crop aging and return 200/JSON response', async () => {
    const mockResult = { alertsCreated: 5, date: '2026-07-14' };
    cronService.runCropAgingAlerts.mockResolvedValue(mockResult);

    await processCropAging(req, res);

    expect(cronService.runCropAgingAlerts).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Crop aging alerts evaluation completed successfully.',
      alertsCreated: 5,
      date: '2026-07-14'
    });
  });

  it('should successfully evaluate crop aging and return 200 using fallback secret when CRON_SECRET env var is missing', async () => {
    delete process.env.CRON_SECRET;
    req.headers.authorization = 'Bearer mandi_cron_secret';
    const mockResult = { alertsCreated: 3, date: '2026-07-14' };
    cronService.runCropAgingAlerts.mockResolvedValue(mockResult);

    await processCropAging(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Crop aging alerts evaluation completed successfully.',
      alertsCreated: 3,
      date: '2026-07-14'
    });
  });


  it('should return 500 when service fails', async () => {
    cronService.runCropAgingAlerts.mockRejectedValue(new Error('Service failure'));

    const originalConsoleError = console.error;
    console.error = jest.fn();

    await processCropAging(req, res);

    console.error = originalConsoleError;

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error during crop aging alerts run'
    });
  });
});
