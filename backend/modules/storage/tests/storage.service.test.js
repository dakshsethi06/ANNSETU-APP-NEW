const crypto = require('crypto');
const storageService = require('../storage.service');
const storageRepository = require('../storage.repository');
const { DEFAULT_COLD_STORAGE_ID } = require('../../../config/constants');

jest.mock('../storage.repository');

describe('storage.service unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetchColdStorages delegates directly to the repository', async () => {
    const mockList = [{ id: 'cs1', name: 'Sharma CS' }];
    storageRepository.getColdStorages.mockResolvedValueOnce(mockList);

    const result = await storageService.fetchColdStorages();

    expect(storageRepository.getColdStorages).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });

  describe('registerNewColdStorage', () => {
    test('generates storage code and default values, hashes mpin, and creates database entry', async () => {
      const data = {
        id: 'cs123456',
        displayName: 'Sharma Cold Storage',
        contactPerson: 'Mr. Sharma',
        phone: '9876543210',
        mpin: '1234'
      };

      const result = await storageService.registerNewColdStorage(data);

      expect(storageRepository.createColdStorage).toHaveBeenCalledWith(expect.arrayContaining([
        'cs123456',
        'CS-CS1234',
        'Sharma Cold Storage',
        'Sharma Cold Storage',
        'Mr. Sharma',
        '9876543210',
        'contact@cs123456.com',
        'Tundla',
        'Firozabad',
        'Uttar Pradesh',
        'Tundla, Firozabad',
        5000.0,
        10,
        'APPROVED',
        expect.any(Date),
        expect.any(Date),
        expect.any(Date),
        expect.any(Date),
        true,
        expect.any(Date),
        'Onboarding Consent',
        'v1.0',
        crypto.createHash('sha256').update('1234').digest('hex')
      ]));

      expect(result).toEqual({
        id: 'cs123456',
        name: 'Sharma Cold Storage',
        city: 'Tundla',
        district: 'Firozabad',
        state: 'Uttar Pradesh',
        address: 'Tundla, Firozabad'
      });
    });

    test('applies defaults if optional input values are completely omitted', async () => {
      const data = {
        id: 'cs_test',
        displayName: 'Test CS'
      };

      const result = await storageService.registerNewColdStorage(data);

      expect(storageRepository.createColdStorage).toHaveBeenCalledWith(expect.arrayContaining([
        'cs_test',
        'CS-CS_TES',
        'Test CS',
        'Test CS',
        'Manager',
        '9999999999',
        'contact@cs_test.com',
        'Tundla',
        'Firozabad',
        'Uttar Pradesh',
        'Tundla, Firozabad',
        5000.0,
        10,
        'APPROVED',
        expect.any(Date),
        expect.any(Date),
        expect.any(Date),
        expect.any(Date),
        true,
        expect.any(Date),
        'Onboarding Consent',
        'v1.0',
        crypto.createHash('sha256').update('1111').digest('hex') // default mpin fallback
      ]));

      expect(result.address).toBe('Tundla, Firozabad');
    });
  });

  describe('fetchStorageSummary', () => {
    test('resolves with DEFAULT_COLD_STORAGE_ID if coldStorageId query is omitted', async () => {
      storageRepository.getStorageSummaryData.mockResolvedValueOnce(null);

      await storageService.fetchStorageSummary(null);

      expect(storageRepository.getStorageSummaryData).toHaveBeenCalledWith(DEFAULT_COLD_STORAGE_ID);
    });

    test('returns null if repository returns null (facility not found)', async () => {
      storageRepository.getStorageSummaryData.mockResolvedValueOnce(null);

      const result = await storageService.fetchStorageSummary('ghost');

      expect(result).toBeNull();
    });

    test('returns correctly mapped and formatted storage summary', async () => {
      const mockDbData = {
        cs: { id: 'cs1', displayName: 'Sharma CS', city: 'Tundla', district: 'Firozabad', state: 'Uttar Pradesh' },
        stock: { active_packets: '1200', active_weight: '12000.0', total_packets: '2000', total_weight: '20000.0' },
        dues: { total_dues: '54000.5', farmers_count: '15' },
        today: { entries_count: '2', packets_count: '250' },
        activity: [
          { id: 'act1', commodity: 'Potato', kism: 'Kufri', roomId: 'R1', rackId: 'RK1', packets: 100, weightQtl: '1000.0', status: 'Healthy', amadDate: new Date(Date.now() - 3 * 24 * 3600000).toISOString() },
          { id: 'act2', commodity: 'Garlic', kism: null, roomId: null, rackId: null, packets: 50, weightQtl: null, status: null, amadDate: new Date().toISOString() }
        ]
      };
      storageRepository.getStorageSummaryData.mockResolvedValueOnce(mockDbData);

      const result = await storageService.fetchStorageSummary('cs1');

      expect(result).toEqual({
        coldStorage: {
          id: 'cs1',
          name: 'Sharma CS',
          location: 'Tundla, Firozabad, Uttar Pradesh',
          city: 'Tundla',
          district: 'Firozabad',
          state: 'Uttar Pradesh'
        },
        stock: {
          packets: 1200,
          weightMt: 1200.0, // active_weight 12000.0 * 0.1
          totalPackets: 2000,
          totalWeightMt: 2000.0 // total_weight 20000.0 * 0.1
        },
        dues: {
          amount: 54000.5,
          farmersCount: 15
        },
        todayAmad: {
          entries: 2,
          packets: 250
        },
        recentActivity: [
          { id: 'act1', commodity: 'Potato', variety: 'Kufri', room: 'R1', rack: 'RK1', bags: 100, weightMt: 100.0, ageDays: 3, status: 'Healthy' },
          { id: 'act2', commodity: 'Garlic', variety: '-', room: '-', rack: '-', bags: 50, weightMt: 0.0, ageDays: 0, status: 'Good' } // fallback checks
        ]
      });
    });

    test('handles missing or falsy numeric inputs safely returning default zeros', async () => {
      const mockDbData = {
        cs: { id: 'cs1', displayName: 'CS', city: 'C', district: 'D', state: 'S' },
        stock: {},
        dues: {},
        today: {},
        activity: []
      };
      storageRepository.getStorageSummaryData.mockResolvedValueOnce(mockDbData);

      const result = await storageService.fetchStorageSummary('cs1');

      expect(result.stock).toEqual({ packets: 0, weightMt: 0, totalPackets: 0, totalWeightMt: 0 });
      expect(result.dues).toEqual({ amount: 0, farmersCount: 0 });
      expect(result.todayAmad).toEqual({ entries: 0, packets: 0 });
      expect(result.recentActivity).toEqual([]);
    });
  });
});
