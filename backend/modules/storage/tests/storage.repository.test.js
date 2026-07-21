const db = require('../../../config/database');
const storageRepository = require('../storage.repository');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('storage.repository unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getColdStorages queries database and returns list sorted by displayName', async () => {
    const mockDbRows = [{
      id: 'cs1',
      name: 'Sharma',
      phone: '999',
      city: 'Tundla',
      district: 'Firozabad',
      state: 'UP',
      capacityQtl: 5000,
      rate: 140,
      usedPackets: 1200
    }];
    db.query.mockResolvedValueOnce({ rows: mockDbRows });

    const result = await storageRepository.getColdStorages();

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM public."ColdStorageOnboarding" c'));
    expect(result).toEqual([{
      id: 'cs1',
      name: 'Sharma',
      phone: '999',
      city: 'Tundla',
      district: 'Firozabad',
      state: 'UP',
      rate: 140,
      available: 8800 // (5000 * 2) - 1200
    }]);
  });

  test('createColdStorage inserts into database', async () => {
    db.query.mockResolvedValueOnce();

    const params = ['cs1', 'CS-CS1', 'CS1 Legal', 'CS1 Disp', 'Mgr', '999', 'cs@mail.com', 'Tundla', 'Firozabad', 'UP', 'Addr', 5000, 10, 'APPROVED', null, null, null, null, true, null, 'Consent', 'v1.0', 'hash'];
    await storageRepository.createColdStorage(params);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO public."ColdStorageOnboarding"'), params);
  });

  describe('getStorageSummaryData', () => {
    test('returns null if cold storage onboarding details do not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // csRes is empty

      const result = await storageRepository.getStorageSummaryData('ghost_cs');

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    test('performs multiple queries sequentially and compiles details when cold storage exists', async () => {
      const mockCs = { id: 'cs1', displayName: 'CS1' };
      const mockStock = { active_packets: '500' };
      const mockDues = { total_dues: '1000' };
      const mockToday = { entries_count: '3' };
      const mockActivity = [{ id: 'act1', packets: 100 }];

      db.query
        .mockResolvedValueOnce({ rows: [mockCs] })     // csRes
        .mockResolvedValueOnce({ rows: [mockStock] })  // stockRes
        .mockResolvedValueOnce({ rows: [mockDues] })   // duesRes
        .mockResolvedValueOnce({ rows: [mockToday] })  // todayRes
        .mockResolvedValueOnce({ rows: mockActivity }); // activityRes

      const result = await storageRepository.getStorageSummaryData('cs1');

      expect(db.query).toHaveBeenCalledTimes(5);
      expect(db.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM public."ColdStorageOnboarding" WHERE id = $1'), ['cs1']);
      expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM public."AmadLot" WHERE "coldStorageId" = $1'), ['cs1']);
      expect(db.query).toHaveBeenNthCalledWith(3, expect.stringContaining('FROM public."NikasiTransaction" WHERE "coldStorageId" = $1'), ['cs1']);
      expect(db.query).toHaveBeenNthCalledWith(4, expect.stringContaining('CURRENT_DATE'), ['cs1']);
      expect(db.query).toHaveBeenNthCalledWith(5, expect.stringContaining('ORDER BY "amadDate" DESC LIMIT 5'), ['cs1']);

      expect(result).toEqual({
        cs: mockCs,
        stock: mockStock,
        dues: mockDues,
        today: mockToday,
        activity: mockActivity
      });
    });
  });
});
