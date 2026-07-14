jest.mock('../../config/database', () => ({ query: jest.fn() }));

const db = require('../../config/database');
const repo = require('./farmer.repository');

describe('farmer.repository (main)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getColdStorageByPhone', () => {
    test('returns row when found', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'CS1', mpin: 'hash' }] });
      expect(await repo.getColdStorageByPhone('987')).toEqual({ id: 'CS1', mpin: 'hash' });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ColdStorageOnboarding'), ['987']);
    });

    test('returns undefined when not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      expect(await repo.getColdStorageByPhone('000')).toBeUndefined();
    });
  });

  describe('mpin updates', () => {
    test('updateColdStorageMpin runs UPDATE with hash and id', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await repo.updateColdStorageMpin('CS1', 'newhash');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "ColdStorageOnboarding"'),
        ['newhash', 'CS1']
      );
    });

    test('updateFarmerMpin runs UPDATE with hash and id', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await repo.updateFarmerMpin('F1', 'newhash');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Farmer"'),
        ['newhash', 'F1']
      );
    });
  });

  describe('lookups', () => {
    test('getFarmerBasicDetails returns row or undefined', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'F1' }] });
      expect(await repo.getFarmerBasicDetails('F1')).toEqual({ id: 'F1' });

      db.query.mockResolvedValue({ rows: [] });
      expect(await repo.getFarmerBasicDetails('NOPE')).toBeUndefined();
    });

    test('getColdStorageDetailsForFarmer returns row', async () => {
      db.query.mockResolvedValue({ rows: [{ displayName: 'Sharma CS' }] });
      expect(await repo.getColdStorageDetailsForFarmer('CS1')).toEqual({ displayName: 'Sharma CS' });
    });

    test('getPaymentsForFarmer returns all rows', async () => {
      const rows = [{ id: 'P1' }, { id: 'P2' }];
      db.query.mockResolvedValue({ rows });
      expect(await repo.getPaymentsForFarmer('F1')).toEqual(rows);
    });
  });

  describe('OTP verification records', () => {
    test('deleteOtpVerification deletes by farmer and targetType', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await repo.deleteOtpVerification('F1', 'phone');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "OtpVerification"'),
        ['F1', 'phone']
      );
    });

    test('insertOtpVerification inserts with 5-minute expiry', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await repo.insertOtpVerification('V1', 'F1', 'phone', '987', '123456');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '5 minutes'"),
        ['V1', 'F1', 'phone', '987', '123456']
      );
    });

    test('getOtpVerification returns latest unexpired row', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'V1', code: '123456' }] });
      expect(await repo.getOtpVerification('F1', 'phone')).toEqual({ id: 'V1', code: '123456' });
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('"expiresAt" > NOW()'),
        ['F1', 'phone']
      );
    });
  });

  describe('profile updates', () => {
    test('updateFarmerProfile passes all fields and returns row', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'F1', name: 'Ram' }] });
      const result = await repo.updateFarmerProfile('F1', 'Ram', 'Shyam', 'V1', 'D1', 'T1');
      expect(result).toEqual({ id: 'F1', name: 'Ram' });
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE'),
        ['Ram', 'Shyam', 'V1', 'D1', 'T1', 'F1']
      );
    });

    test('updateFarmerTarget writes to phone column for phone type', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await repo.updateFarmerTarget('F1', 'phone', '9999999999');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('"phone"'),
        ['9999999999', 'F1']
      );
    });

    test('updateFarmerTarget writes to email column for non-phone type', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await repo.updateFarmerTarget('F1', 'email', 'ram@x.com');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('"email"'),
        ['ram@x.com', 'F1']
      );
    });

    test('updateFarmerBasicDetails returns remapped row', async () => {
      db.query.mockResolvedValue({ rows: [{ serial_number: 'F1', name: 'Ram' }] });
      const result = await repo.updateFarmerBasicDetails('F1', 'Ram', '987', 'r@x.com', 'AAD1', 'PAN1');
      expect(result).toEqual({ serial_number: 'F1', name: 'Ram' });
    });

    test('verifyAndUpdateFarmerProfile returns remapped row', async () => {
      db.query.mockResolvedValue({ rows: [{ serial_number: 'F1' }] });
      const result = await repo.verifyAndUpdateFarmerProfile('F1', 'Ram', '987', 'r@x.com');
      expect(result).toEqual({ serial_number: 'F1' });
    });
  });
});