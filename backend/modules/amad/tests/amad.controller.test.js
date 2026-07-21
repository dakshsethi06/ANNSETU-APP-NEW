const { createAmad, getHoldings } = require('../amad.controller');
const amadService = require('../amad.service');

// Mock the service
jest.mock('../amad.service');

describe('Amad Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createAmad', () => {
    it('should successfully create an amad lot and return 201', async () => {
      const mockBody = { coldStorageId: 'CS123', commodity: 'Potato', packets: 100, weightQtl: 50 };
      const mockLot = { id: 'AM-123456', ...mockBody };
      req = { body: mockBody };

      amadService.createNewAmadLot.mockResolvedValue(mockLot);

      await createAmad(req, res);

      expect(amadService.createNewAmadLot).toHaveBeenCalledWith(mockBody);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, lot: mockLot });
    });

    it('should return error status and message when service throws with statusCode', async () => {
      req = { body: {} };
      const mockError = new Error('coldStorageId is required.');
      mockError.statusCode = 400;

      amadService.createNewAmadLot.mockRejectedValue(mockError);

      const originalConsoleError = console.error;
      console.error = jest.fn();

      await createAmad(req, res);

      console.error = originalConsoleError;

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'coldStorageId is required.' });
    });

    it('should default to 400 status and default message when service throws generic error', async () => {
      req = { body: {} };
      const mockError = new Error();

      amadService.createNewAmadLot.mockRejectedValue(mockError);

      const originalConsoleError = console.error;
      console.error = jest.fn();

      await createAmad(req, res);

      console.error = originalConsoleError;

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to register Amad lot in database' });
    });
  });

  describe('getHoldings', () => {
    it('should successfully return holdings', async () => {
      const mockHoldings = [{ id: '1', lot_id: 'AM-123', crop: 'Potato' }];
      amadService.fetchHoldings.mockResolvedValue(mockHoldings);

      await getHoldings(req, res);

      expect(amadService.fetchHoldings).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, holdings: mockHoldings });
    });

    it('should return 500 status and error message when service fails', async () => {
      const mockError = new Error('Database connection failed');
      amadService.fetchHoldings.mockRejectedValue(mockError);

      const originalConsoleError = console.error;
      console.error = jest.fn();

      await getHoldings(req, res);

      console.error = originalConsoleError;

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to fetch holdings from database' });
    });
  });
});
