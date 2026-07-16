const db = require('../../../config/database');
const voucherRepository = require('../voucher.repository');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('Voucher Repository Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVoucherByCode', () => {
    test('returns voucher row if found', async () => {
      const mockVoucher = { code: 'SAVE50', value: 50 };
      db.query.mockResolvedValueOnce({ rows: [mockVoucher] });

      const result = await voucherRepository.getVoucherByCode('SAVE50');
      expect(result).toEqual(mockVoucher);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['SAVE50']);
    });

    test('returns null if not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await voucherRepository.getVoucherByCode('SAVE50');
      expect(result).toBeNull();
    });
  });

  describe('getVoucherByCodeForUpdate', () => {
    test('uses transaction client if provided', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rows: [{ code: 'SAVE50' }] }) };
      const result = await voucherRepository.getVoucherByCodeForUpdate('SAVE50', mockClient);
      expect(result).toEqual({ code: 'SAVE50' });
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), ['SAVE50']);
      expect(db.query).not.toHaveBeenCalled();
    });

    test('falls back to default db if client not provided', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ code: 'SAVE50' }] });
      const result = await voucherRepository.getVoucherByCodeForUpdate('SAVE50');
      expect(result).toEqual({ code: 'SAVE50' });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), ['SAVE50']);
    });

    // Covers the `|| null` branch on line 11 — when FOR UPDATE finds no matching row
    test('returns null if no voucher found for update', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }) };
      const result = await voucherRepository.getVoucherByCodeForUpdate('NONEXISTENT', mockClient);
      expect(result).toBeNull();
    });
  });

  describe('incrementVoucherUsage', () => {
    test('executes UPDATE query returning updated row', async () => {
      const mockVoucher = { code: 'SAVE50', usageCount: 1 };
      db.query.mockResolvedValueOnce({ rows: [mockVoucher] });

      const result = await voucherRepository.incrementVoucherUsage('SAVE50');
      expect(result).toEqual(mockVoucher);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "PromoVoucher"'), ['SAVE50']);
    });
  });

  describe('insertVoucherLedger', () => {
    test('inserts record and returns it', async () => {
      const mockLedger = { id: 'vl_123', farmerId: 'F1', voucherCode: 'SAVE50', discountApplied: 50, orderId: 'O1' };
      db.query.mockResolvedValueOnce({ rows: [mockLedger] });

      const result = await voucherRepository.insertVoucherLedger({
        farmerId: 'F1',
        voucherCode: 'SAVE50',
        discountApplied: 50,
        orderId: 'O1'
      });
      expect(result).toEqual(mockLedger);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "PromoVoucherLedger"'),
        expect.arrayContaining(['F1', 'SAVE50', 50, 'O1'])
      );
    });
  });

  describe('createVoucher', () => {
    test('inserts voucher with default values', async () => {
      const mockVoucher = { code: 'SAVE50', type: 'FLAT', value: 50 };
      db.query.mockResolvedValueOnce({ rows: [mockVoucher] });

      const expiryDate = new Date();
      const result = await voucherRepository.createVoucher({
        code: 'SAVE50',
        type: 'FLAT',
        value: 50,
        expiryDate
      });
      expect(result).toEqual(mockVoucher);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "PromoVoucher"'),
        [
          'SAVE50', 'FLAT', 50, 0, null, 
          1, 'ACTIVE', expiryDate, null, null
        ]
      );
    });
  });
});
