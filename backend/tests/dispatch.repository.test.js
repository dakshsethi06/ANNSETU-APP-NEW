jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
const repo = require('../modules/dispatch/dispatch.repository');

describe('dispatch.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDispatchesData', () => {
    test('filters by farmerId when provided', async () => {
      const rows = [{ id: 'N1' }];
      db.query.mockResolvedValue({ rows });
      const result = await repo.getDispatchesData({ farmerId: 'F1' });
      expect(result).toEqual(rows);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n."farmerId" = $1'),
        ['F1']
      );
    });

    test('filters by coldStorageId after verifying it exists', async () => {
      // 1st query: verifyColdStorage lookup; 2nd: the dispatches
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 'CS1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'N2' }] });

      const result = await repo.getDispatchesData({ coldStorageId: 'CS1' });
      expect(result).toEqual([{ id: 'N2' }]);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    test('throws when coldStorageId does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // verify finds nothing
      await expect(
        repo.getDispatchesData({ coldStorageId: 'GHOST' })
      ).rejects.toThrow('Cold Storage record with ID "GHOST" not found.');
    });
  });

  describe('getDispatchById', () => {
    test('returns the row when found', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'N1', status: 'CREATED' }] });
      const result = await repo.getDispatchById('N1');
      expect(result).toEqual({ id: 'N1', status: 'CREATED' });
    });

    test('returns null when not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      expect(await repo.getDispatchById('NOPE')).toBeNull();
    });
  });

  describe('insertDispatch', () => {
    test('inserts with correct defaults and returns row', async () => {
      const created = { id: 'N1', status: 'CREATED' };
      db.query.mockResolvedValue({ rows: [created] });

      const result = await repo.insertDispatch({
        id: 'N1', nikasiNumber: 'NK-001', farmerId: 'F1',
        coldStorageId: 'CS1', lotId: 'AM-1', bags: '50',
        weightQtl: 25, commodity: 'Potato', vehicleNumber: null,
      });

      expect(result).toEqual(created);
      const params = db.query.mock.calls[0][1];
      expect(params[5]).toBe(50);                    // bags parsed to integer
      expect(params[7]).toBe('Farmer Withdrawal');   // dispatchType default
      expect(params[9]).toBeNull();                  // vehicleNumber fallback
      expect(params[11]).toBe('CREATED');            // initial status
    });
  });

  describe('updateDispatchStatus', () => {
    test('updates and returns the row', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'N1', status: 'IN_TRANSIT' }] });
      const result = await repo.updateDispatchStatus('N1', 'IN_TRANSIT');
      expect(result).toEqual({ id: 'N1', status: 'IN_TRANSIT' });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), ['N1', 'IN_TRANSIT']);
    });

    test('returns null for unknown id', async () => {
      db.query.mockResolvedValue({ rows: [] });
      expect(await repo.updateDispatchStatus('NOPE', 'DISPATCHED')).toBeNull();
    });
  });

  describe('getActiveLotForDispatch', () => {
    test('returns lot on exact commodity match (1st query)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'AM-1' }] });
      const result = await repo.getActiveLotForDispatch('F1', 'Potato');
      expect(result).toBe('AM-1');
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    test('falls back to any lot for the farmer (2nd query)', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'AM-2' }] });
      const result = await repo.getActiveLotForDispatch('F1', 'Onion');
      expect(result).toBe('AM-2');
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    test('returns null when farmer has no lots at all', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      expect(await repo.getActiveLotForDispatch('F1', 'Onion')).toBeNull();
    });
  });

  describe('verifyColdStorage', () => {
    test('returns id when record exists', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'CS1' }] });
      expect(await repo.verifyColdStorage('CS1')).toBe('CS1');
    });

    test('throws when id is missing', async () => {
      await expect(repo.verifyColdStorage(undefined)).rejects.toThrow(
        'coldStorageId is required.'
      );
    });

    test('throws when record not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await expect(repo.verifyColdStorage('GHOST')).rejects.toThrow('not found');
    });
  });

  describe('getFarmerWithMpin', () => {
    test('returns farmer row when found', async () => {
      db.query.mockResolvedValue({ rows: [{ mpin: 'hash', name: 'Ram' }] });
      expect(await repo.getFarmerWithMpin('F1')).toEqual({ mpin: 'hash', name: 'Ram' });
    });

    test('returns null when not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      expect(await repo.getFarmerWithMpin('NOPE')).toBeNull();
    });
  });

  describe('getColdStorageName', () => {
    test('returns displayName when found', async () => {
      db.query.mockResolvedValue({ rows: [{ displayName: 'Sharma CS' }] });
      expect(await repo.getColdStorageName('CS1')).toBe('Sharma CS');
    });

    test('returns fallback name when not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      expect(await repo.getColdStorageName('NOPE')).toBe('Cold Storage');
    });
  });

  describe('deleteNotification', () => {
    test('runs DELETE with userId, title, and LIKE pattern', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await repo.deleteNotification('F1', 'Dispatch Request', '%NK-001%');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "AppNotification"'),
        ['F1', 'Dispatch Request', '%NK-001%']
      );
    });
  });
});