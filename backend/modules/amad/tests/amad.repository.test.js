jest.mock('../../../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../../../config/database');
const {
  createAmadLot,
  getFarmer,
  getHoldingsData,
} = require('../amad.repository');

describe('amad.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAmadLot', () => {
    test('inserts and returns the created row', async () => {
      const fakeRow = { id: 'AM-1', commodity: 'Potato' };
      db.query.mockResolvedValue({ rows: [fakeRow] });

      const params = ['AM-1', 'AMAD-123456', 'M-F1', 'F1', 'CS1', 'Potato', null, 'R1', null, 100, 50, 100, 50, 'Fresh', new Date(), new Date(), new Date()];
      const result = await createAmadLot(params);

      expect(result).toEqual(fakeRow);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "AmadLot"'),
        params
      );
    });
  });

  describe('getFarmer', () => {
    test('returns farmer row when found', async () => {
      db.query.mockResolvedValue({ rows: [{ name: 'Ram', phone: '987' }] });
      const result = await getFarmer('F1');
      expect(result).toEqual({ name: 'Ram', phone: '987' });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), ['F1']);
    });

    test('returns fallback object when farmer not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await getFarmer('UNKNOWN');
      expect(result).toEqual({ name: 'Farmer', phone: null });
    });
  });

  describe('getHoldingsData', () => {
    test('returns all holding rows', async () => {
      const rows = [{ lot_id: 'AM-1' }, { lot_id: 'AM-2' }];
      db.query.mockResolvedValue({ rows });
      const result = await getHoldingsData();
      expect(result).toEqual(rows);
    });
  });
});