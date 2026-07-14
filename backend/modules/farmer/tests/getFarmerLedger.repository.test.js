const db = require('../../../config/database');
const { getFarmerLedger } = require('../repositories/getFarmerLedger.repository');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('Ledger Calculation Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should compute chronological running balance correctly starting from openingBalance', async () => {
    // Mock opening balance query
    db.query.mockImplementation((sql, params) => {
      if (sql.includes('SELECT "openingBalance"')) {
        return Promise.resolve({ rows: [{ openingBalance: 1500 }] });
      }
      if (sql.includes('FROM "NikasiTransaction"')) {
        // Rent bill (debited amount) -> should increase outstanding dues
        return Promise.resolve({
          rows: [
            { id: '1', date: '2026-07-01T10:00:00.000Z', amount: -500 }
          ]
        });
      }
      if (sql.includes('FROM "BillingEntry"')) {
        // Manual bill (debited amount) -> should increase outstanding dues
        return Promise.resolve({
          rows: [
            { id: '2', date: '2026-07-02T10:00:00.000Z', amount: -200 }
          ]
        });
      }
      if (sql.includes('FROM "Payment"')) {
        // Payment received (credited amount) -> should reduce outstanding dues
        return Promise.resolve({
          rows: [
            { id: '3', date: '2026-07-03T10:00:00.000Z', amount: 800 }
          ]
        });
      }
      // Fallback CS check
      return Promise.resolve({ rows: [] });
    });

    const result = await getFarmerLedger('farmer_123');

    // Expected order chronologically:
    // Start: 1500
    // 2026-07-01: Rent bill (-500). Dues increase: 1500 - (-500) = 2000
    // 2026-07-02: Manual bill (-200). Dues increase: 2000 - (-200) = 2200
    // 2026-07-03: Payment (+800). Dues decrease: 2200 - (+800) = 1400
    // Ledger returns reversed (newest first):
    // Index 0: 2026-07-03 -> balance: 1400
    // Index 1: 2026-07-02 -> balance: 2200
    // Index 2: 2026-07-01 -> balance: 2000

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('3');
    expect(result[0].balance).toBe(1400);
    expect(result[1].id).toBe('2');
    expect(result[1].balance).toBe(2200);
    expect(result[2].id).toBe('1');
    expect(result[2].balance).toBe(2000);
  });

  test('should compute cold storage running balance correctly with the standardized dues direction', async () => {
    // Mock Cold Storage check to be true
    db.query.mockImplementation((sql, params) => {
      if (sql.includes('FROM "ColdStorageOnboarding"')) {
        return Promise.resolve({ rows: [{ id: 'cs_123' }] });
      }
      if (sql.includes('FROM "NikasiTransaction"')) {
        // Rent bill (debited amount) -> should increase outstanding dues
        return Promise.resolve({
          rows: [
            { id: '1', date: '2026-07-01T10:00:00.000Z', amount: -500 }
          ]
        });
      }
      if (sql.includes('FROM "BillingEntry"')) {
        // Manual bill (debited amount) -> should increase outstanding dues
        return Promise.resolve({
          rows: [
            { id: '2', date: '2026-07-02T10:00:00.000Z', amount: -200 }
          ]
        });
      }
      if (sql.includes('FROM "Payment"')) {
        // Payment received (credited amount) -> should reduce outstanding dues
        return Promise.resolve({
          rows: [
            { id: '3', date: '2026-07-03T10:00:00.000Z', amount: 800 }
          ]
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await getFarmerLedger('cs_123');

    // Expected order chronologically (starting at 0 for cold storage ledger):
    // Start: 0
    // 2026-07-01: Rent bill (-500). Dues increase: 0 - (-500) = 500
    // 2026-07-02: Manual bill (-200). Dues increase: 500 - (-200) = 700
    // 2026-07-03: Payment (+800). Dues decrease: 700 - (+800) = -100
    // Ledger returns reversed (newest first):
    // Index 0: 2026-07-03 -> balance: -100
    // Index 1: 2026-07-02 -> balance: 700
    // Index 2: 2026-07-01 -> balance: 500

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('3');
    expect(result[0].balance).toBe(-100);
    expect(result[1].id).toBe('2');
    expect(result[1].balance).toBe(700);
    expect(result[2].id).toBe('1');
    expect(result[2].balance).toBe(500);
  });

  test('should handle farmer ledger when openingBalance query returns no rows', async () => {
    db.query.mockImplementation((sql, params) => {
      if (sql.includes('SELECT "openingBalance"')) {
        return Promise.resolve({ rows: [] }); // Empty rows
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await getFarmerLedger('farmer_123');
    // Ledger should be empty, but we're mostly testing that it doesn't crash
    // and correctly falls back to 0.
    expect(result).toHaveLength(0);
  });

  test('should handle farmer ledger when openingBalance is null', async () => {
    db.query.mockImplementation((sql, params) => {
      if (sql.includes('SELECT "openingBalance"')) {
        return Promise.resolve({ rows: [{ openingBalance: null }] }); // Null balance
      }
      if (sql.includes('FROM "NikasiTransaction"')) {
        return Promise.resolve({
          rows: [
            { id: '1', date: '2026-07-01T10:00:00.000Z', amount: -500 }
          ]
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await getFarmerLedger('farmer_123');
    // Start: 0
    // 2026-07-01: Rent bill (-500). Dues increase: 0 - (-500) = 500
    expect(result).toHaveLength(1);
    expect(result[0].balance).toBe(500);
  });
});
