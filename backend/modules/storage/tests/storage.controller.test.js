const storageController = require('../storage.controller');
const storageService = require('../storage.service');

jest.mock('../storage.service');

describe('storage.controller unit tests', () => {
  let req, res, spyStatus, spyJson;

  beforeEach(() => {
    jest.clearAllMocks();
    spyStatus = jest.fn().mockReturnThis();
    spyJson = jest.fn();
    res = {
      status: spyStatus,
      json: spyJson
    };
  });

  describe('getColdStorages', () => {
    test('returns 200 and cold storages on success', async () => {
      req = {};
      const mockCS = [{ id: 'cs1', name: ' शर्मा सीएस' }];
      storageService.fetchColdStorages.mockResolvedValueOnce(mockCS);

      await storageController.getColdStorages(req, res);

      expect(storageService.fetchColdStorages).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, coldStorages: mockCS });
    });

    test('returns 500 when fetchColdStorages throws an error', async () => {
      req = {};
      storageService.fetchColdStorages.mockRejectedValueOnce(new Error('Fetch failed'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await storageController.getColdStorages(req, res);

      expect(spyError).toHaveBeenCalledWith(expect.any(String), 'Fetch failed');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to fetch cold storages from database' });
      spyError.mockRestore();
    });
  });

  describe('registerColdStorage', () => {
    test('returns 201 and cold storage on success', async () => {
      req = { body: { id: 'cs1', displayName: 'CS1' } };
      const mockResult = { id: 'cs1', name: 'CS1' };
      storageService.registerNewColdStorage.mockResolvedValueOnce(mockResult);

      await storageController.registerColdStorage(req, res);

      expect(storageService.registerNewColdStorage).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, coldStorage: mockResult });
    });

    test('returns 400 when unique constraint violation error 23505 occurs', async () => {
      req = { body: { id: 'cs1', displayName: 'CS1' } };
      const err = new Error('Unique constraint');
      err.code = '23505';
      storageService.registerNewColdStorage.mockRejectedValueOnce(err);

      await storageController.registerColdStorage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Cold Storage with ID cs1 already exists' });
    });

    test('returns 500 when other database errors occur during registration', async () => {
      req = { body: { id: 'cs1', displayName: 'CS1' } };
      storageService.registerNewColdStorage.mockRejectedValueOnce(new Error('DB Failed'));

      await storageController.registerColdStorage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'DB Failed' });
    });

    test('returns 500 with custom fallback message on error without message', async () => {
      req = { body: { id: 'cs1', displayName: 'CS1' } };
      const err = new Error('');
      storageService.registerNewColdStorage.mockRejectedValueOnce(err);

      await storageController.registerColdStorage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to register cold storage in database' });
    });
  });

  describe('getSummary', () => {
    test('returns 200 and summary on success', async () => {
      req = { query: { coldStorageId: 'cs1' } };
      const mockSummary = { coldStorage: { id: 'cs1' } };
      storageService.fetchStorageSummary.mockResolvedValueOnce(mockSummary);

      await storageController.getSummary(req, res);

      expect(storageService.fetchStorageSummary).toHaveBeenCalledWith('cs1');
      expect(res.json).toHaveBeenCalledWith({ success: true, summary: mockSummary });
    });

    test('returns 404 if summary is null (not found)', async () => {
      req = { query: { coldStorageId: 'cs1' } };
      storageService.fetchStorageSummary.mockResolvedValueOnce(null);

      await storageController.getSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Cold storage not found.' });
    });

    test('returns 500 on service failure', async () => {
      req = { query: { coldStorageId: 'cs1' } };
      storageService.fetchStorageSummary.mockRejectedValueOnce(new Error('Fetch failed'));

      await storageController.getSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to fetch cold storage summary' });
    });
  });
});
