jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const db = require('../../../config/database');
const { getFarmersData } = require('../repositories/getFarmersData.repository');
const { getFarmerByPhone } = require('../repositories/getFarmerByPhone.repository');
const { getFarmerLedger } = require('../repositories/getFarmerLedger.repository');
const { createFarmerRecord } = require('../repositories/createFarmerRecord.repository');

describe('farmer sub-repositories', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getFarmersData', () => {
    test('queries without filters when none given', async () => {
      db.query.mockResolvedValue({ rows: [{ serial_number: 'F1' }] });
      const result = await getFarmersData(undefined, undefined);
      expect(result).toEqual([{ serial_number: 'F1' }]);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), []);
    });

    test('adds state filter with ILIKE', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await getFarmersData('UP', undefined);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('f.state ILIKE $1');
      expect(params).toEqual(['UP']);
    });

    test('adds both filters with correct param order', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await getFarmersData('UP', 'SN001');
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('f.state ILIKE $1');
      expect(sql).toContain('f.id = $2');
      expect(params).toEqual(['UP', 'SN001']);
    });

    test('computes pendingRent in the query', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await getFarmersData(undefined, undefined);
      expect(db.query.mock.calls[0][0]).toContain('"pendingRent"');
    });
  });

  describe('getFarmerByPhone', () => {
    test('searches with clean and +91 variants', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'F1' }] });
      await getFarmerByPhone('+919876543210');
      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['9876543210', '+919876543210']
      );
    });

    test('handles phone without prefix', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await getFarmerByPhone('9876543210');
      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['9876543210', '+919876543210']
      );
    });

    test('returns undefined when no match', async () => {
      db.query.mockResolvedValue({ rows: [] });
      expect(await getFarmerByPhone('0000000000')).toBeUndefined();
    });
  });

  describe('createFarmerRecord', () => {
    test('inserts with the given 22 params', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const params = Array(22).fill('x');
      await createFarmerRecord(params);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "Farmer"'),
        params
      );
    });
  });

  describe('getFarmerLedger', () => {
    // Query order for a FARMER id:
    // 1. cold storage check → empty
    // 2. nikasi  3. billing  4. payments
    // 5. openingBalance
    const mockFarmerLedgerQueries = ({ nikasi = [], billing = [], payments = [], opening = 0 }) => {
      db.query
        .mockResolvedValueOnce({ rows: [] })                                  // not a CS
        .mockResolvedValueOnce({ rows: nikasi })
        .mockResolvedValueOnce({ rows: billing })
        .mockResolvedValueOnce({ rows: payments })
        .mockResolvedValueOnce({ rows: [{ openingBalance: opening }] });
    };

    test('returns empty array when farmer has no entries', async () => {
      mockFarmerLedgerQueries({});
      expect(await getFarmerLedger('F1')).toEqual([]);
    });

    test('merges entries, sorts by date, computes running balance, returns newest first', async () => {
      mockFarmerLedgerQueries({
        nikasi: [{ id: 'N1', title: 'Rent Bill', date: '2026-01-10', amount: '-1000' }],
        payments: [{ id: 'P1', title: 'Payment Received', date: '2026-01-20', amount: '600' }],
        opening: 0,
      });

      const result = await getFarmerLedger('F1');
      // newest first
      expect(result[0].id).toBe('P1');
      expect(result[1].id).toBe('N1');
      // balance = running of (-amount): bill -1000 → +1000 owed; payment 600 → 400 owed
      expect(result[1].balance).toBe(1000);
      expect(result[0].balance).toBe(400);
    });

    test('includes opening balance in the running total', async () => {
      mockFarmerLedgerQueries({
        payments: [{ id: 'P1', title: 'Payment', date: '2026-01-05', amount: '500' }],
        opening: 2000,
      });
      const result = await getFarmerLedger('F1');
      expect(result[0].balance).toBe(1500); // 2000 - 500
    });

    test('parses string amounts to numbers', async () => {
      mockFarmerLedgerQueries({
        nikasi: [{ id: 'N1', title: 'Bill', date: '2026-01-01', amount: '-250.50' }],
      });
      const result = await getFarmerLedger('F1');
      expect(result[0].amount).toBe(-250.5);
      expect(typeof result[0].amount).toBe('number');
    });

    test('cold storage id: skips openingBalance query and uses CS queries', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 'CS1', displayName: 'Sharma CS' }] }) // IS a CS
        .mockResolvedValueOnce({ rows: [] })   // nikasi (CS variant)
        .mockResolvedValueOnce({ rows: [] })   // billing
        .mockResolvedValueOnce({ rows: [] });  // payments

      const result = await getFarmerLedger('CS1');
      expect(result).toEqual([]);
      expect(db.query).toHaveBeenCalledTimes(4); // no openingBalance query
    });
  });
});