jest.mock('../farmer.repository');
jest.mock('../farmer.helpers', () => ({
  buildCsvStatement: jest.fn().mockReturnValue('csv,content'),
  buildPdfStatement: jest.fn(),
}));
jest.mock('../../../shared/notifications/notifications', () => ({
  logOutboundNotification: jest.fn().mockResolvedValue({}),
  createAppNotification: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../shared/utils/otpUtils', () => ({
  verifySupabaseOtp: jest.fn(),
}));

const farmerRepository = require('../farmer.repository');
const farmerHelpers = require('../farmer.helpers');
const farmerConstants = require('../farmer.constants');
const { verifySupabaseOtp } = require('../../../shared/utils/otpUtils');
const {
  logOutboundNotification,
  createAppNotification,
} = require('../../../shared/notifications/notifications');
const { hashMpin } = require('../../../shared/utils/mpinUtils');
const service = require('../farmer.service');

describe('farmer.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logOutboundNotification.mockResolvedValue({});
    createAppNotification.mockResolvedValue({});
  });

  describe('fetchFarmers', () => {
    test('delegates to repository with filters', async () => {
      const rows = [{ id: 'F1' }];
      farmerRepository.getFarmersData.mockResolvedValue(rows);
      const result = await service.fetchFarmers('UP', 'SN001');
      expect(result).toEqual(rows);
      expect(farmerRepository.getFarmersData).toHaveBeenCalledWith('UP', 'SN001');
    });
  });

  describe('fetchLedger', () => {
    test('delegates to repository getFarmerLedger', async () => {
      const rows = [{ entry: 1 }];
      farmerRepository.getFarmerLedger.mockResolvedValue(rows);
      const result = await service.fetchLedger('F1');
      expect(result).toEqual(rows);
      expect(farmerRepository.getFarmerLedger).toHaveBeenCalledWith('F1');
    });
  });

  describe('registerNewFarmer', () => {
    const data = {
      serial_number: 'SN001',
      name: 'Ram Singh',
      coldStorageId: 'CS1',
      phone: '9876543210',
      mpin: '5678',
    };

    beforeEach(() => {
      farmerRepository.createFarmerRecord.mockResolvedValue({});
    });

    test('throws when coldStorageId is missing', async () => {
      const { coldStorageId, ...noCS } = data;
      await expect(service.registerNewFarmer(noCS)).rejects.toThrow();
      expect(farmerRepository.createFarmerRecord).not.toHaveBeenCalled();
    });

    test('hashes the provided mpin before storing', async () => {
      await service.registerNewFarmer(data);
      const params = farmerRepository.createFarmerRecord.mock.calls[0][0];
      expect(params[params.length - 1]).toBe(hashMpin('5678')); // last param = hashed mpin
      expect(params).not.toContain('5678'); // plain mpin never stored
    });

    test('hashes the DEFAULT mpin when none provided', async () => {
      const { mpin, ...noMpin } = data;
      await service.registerNewFarmer(noMpin);
      const params = farmerRepository.createFarmerRecord.mock.calls[0][0];
      expect(params[params.length - 1]).toBe(hashMpin(farmerConstants.DEFAULT_MPIN));
    });

    test('applies default state and commodity', async () => {
      const result = await service.registerNewFarmer(data);
      expect(result.state).toBe(farmerConstants.DEFAULT_STATE);
      expect(result.commodity).toBe(farmerConstants.DEFAULT_COMMODITY);
    });

    test('builds CS- account number and triggers welcome notifications', async () => {
      await service.registerNewFarmer(data);
      const params = farmerRepository.createFarmerRecord.mock.calls[0][0];
      expect(params[1]).toBe('CS-SN001');
      expect(logOutboundNotification).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'FARMER_REGISTERED', recipientPhone: '9876543210' })
      );
      expect(createAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'SN001' })
      );
    });

    test('registration succeeds even when notifications fail', async () => {
      logOutboundNotification.mockRejectedValue(new Error('SMS down'));
      const result = await service.registerNewFarmer(data);
      expect(result.serial_number).toBe('SN001');
    });

    test('returns null for missing optional fields', async () => {
      const result = await service.registerNewFarmer({
        serial_number: 'SN002', name: 'Shyam', coldStorageId: 'CS1',
      });
      expect(result.phone).toBeNull();
      expect(result.village).toBeNull();
    });
  });

  describe('loginWithMpin', () => {
    describe('cold storage login', () => {
      const cs = { id: 'CS1', displayName: 'Sharma CS', mpin: hashMpin('9999') };

      test('logs in cold storage with correct mpin', async () => {
        farmerRepository.getColdStorageByPhone.mockResolvedValue(cs);
        const result = await service.loginWithMpin('9876543210', '9999');
        expect(result.role).toBe(farmerConstants.ROLES.COLD_STORAGE_FACILITY);
        expect(result.coldStorage).toMatchObject({ id: 'CS1', name: 'Sharma CS' });
      });

      test('rejects wrong mpin for cold storage → 401', async () => {
        farmerRepository.getColdStorageByPhone.mockResolvedValue(cs);
        await expect(service.loginWithMpin('9876543210', '0000')).rejects.toMatchObject({
          statusCode: 401,
        });
      });

      test('SECURITY: cold storage with no mpin — hardcoded default hash is used', async () => {
        // Documents current behavior: a hardcoded SHA-256 hash acts as the
        // fallback MPIN for any cold storage without one set. Whatever plain
        // value hashes to it will log in to ALL such facilities. See audit notes.
        farmerRepository.getColdStorageByPhone.mockResolvedValue({ ...cs, mpin: null });
        // '1234' hashes to 03ac674216... — test that at least random values fail:
        await expect(service.loginWithMpin('9876543210', '8888')).rejects.toMatchObject({
          statusCode: 401,
        });
      });

      test('does NOT check farmer table when phone matches a cold storage', async () => {
        farmerRepository.getColdStorageByPhone.mockResolvedValue(cs);
        await service.loginWithMpin('9876543210', '9999');
        expect(farmerRepository.getFarmerByPhone).not.toHaveBeenCalled();
      });
    });

    describe('farmer login', () => {
      beforeEach(() => {
        farmerRepository.getColdStorageByPhone.mockResolvedValue(null);
      });

      test('throws 404 when phone matches no farmer', async () => {
        farmerRepository.getFarmerByPhone.mockResolvedValue(null);
        await expect(service.loginWithMpin('0000000000', '1234')).rejects.toMatchObject({
          statusCode: 404,
        });
      });

      test('logs in farmer with correct mpin', async () => {
        farmerRepository.getFarmerByPhone.mockResolvedValue({
          id: 'F1', name: 'Ram', phone: '9876543210', state: 'UP', mpin: hashMpin('4321'),
        });
        const result = await service.loginWithMpin('9876543210', '4321');
        expect(result.role).toBe(farmerConstants.ROLES.FARMER);
        expect(result.farmer).toMatchObject({ id: 'F1', name: 'Ram' });
      });

      test('rejects wrong mpin for farmer → 401', async () => {
        farmerRepository.getFarmerByPhone.mockResolvedValue({
          id: 'F1', name: 'Ram', mpin: hashMpin('4321'),
        });
        await expect(service.loginWithMpin('9876543210', '0000')).rejects.toMatchObject({
          statusCode: 401,
        });
      });

      test('SECURITY: farmer with no mpin — DEFAULT_MPIN grants login', async () => {
        // Documents current behavior: farmer.mpin || DEFAULT_MPIN means any
        // farmer who never set an MPIN can be logged into with the default.
        farmerRepository.getFarmerByPhone.mockResolvedValue({
          id: 'F1', name: 'Ram', phone: '9876543210', state: 'UP', mpin: null,
        });
        const result = await service.loginWithMpin(
          '9876543210',
          farmerConstants.DEFAULT_MPIN
        );
        expect(result.role).toBe(farmerConstants.ROLES.FARMER);
      });
    });
  });

  describe('resetUserMpin', () => {
    beforeEach(() => {
      verifySupabaseOtp.mockResolvedValue(true);
      farmerRepository.getColdStorageByPhone.mockResolvedValue(null);
      farmerRepository.getFarmerByPhone.mockResolvedValue({ id: 'F1' });
      farmerRepository.updateFarmerMpin.mockResolvedValue();
      farmerRepository.updateColdStorageMpin.mockResolvedValue();
    });

    test('throws 400 when OTP verification fails', async () => {
      verifySupabaseOtp.mockRejectedValue(new Error('OTP Verification failed: expired'));
      await expect(service.resetUserMpin('9876543210', '000000', '5678')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(farmerRepository.updateFarmerMpin).not.toHaveBeenCalled();
    });

    test('uses fallback message when OTP verification fails without specific message', async () => {
      const err = new Error();
      err.message = '';
      verifySupabaseOtp.mockRejectedValue(err);
      await expect(service.resetUserMpin('9876543210', '000000', '5678')).rejects.toMatchObject({
        statusCode: 400,
        message: farmerConstants.ERROR_MESSAGES.INVALID_OTP,
      });
    });

    test('throws 400 when new mpin is shorter than 4 chars', async () => {
      await expect(service.resetUserMpin('9876543210', '123456', '12')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test('updates cold storage mpin when phone matches a cold storage', async () => {
      farmerRepository.getColdStorageByPhone.mockResolvedValue({ id: 'CS1' });
      await service.resetUserMpin('+919876543210', '123456', '5678');
      expect(farmerRepository.updateColdStorageMpin).toHaveBeenCalledWith('CS1', hashMpin('5678'));
      expect(farmerRepository.updateFarmerMpin).not.toHaveBeenCalled();
    });

    test('strips +91 prefix before cold storage lookup', async () => {
      farmerRepository.getColdStorageByPhone.mockResolvedValue({ id: 'CS1' });
      await service.resetUserMpin('+919876543210', '123456', '5678');
      expect(farmerRepository.getColdStorageByPhone).toHaveBeenCalledWith('9876543210');
    });

    test('updates farmer mpin (hashed) when not a cold storage', async () => {
      await service.resetUserMpin('9876543210', '123456', '5678');
      expect(farmerRepository.updateFarmerMpin).toHaveBeenCalledWith('F1', hashMpin('5678'));
    });

    test('throws 404 when neither cold storage nor farmer found', async () => {
      farmerRepository.getFarmerByPhone.mockResolvedValue(null);
      await expect(service.resetUserMpin('9876543210', '123456', '5678')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('generateStatement', () => {
    test('throws 404 when farmer not found', async () => {
      farmerRepository.getFarmerBasicDetails.mockResolvedValue(null);
      await expect(service.generateStatement('GHOST')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    test('builds CSV from farmer and ledger', async () => {
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ id: 'F1', name: 'Ram' });
      farmerRepository.getFarmerLedger.mockResolvedValue([{ entry: 1 }]);
      const result = await service.generateStatement('F1');
      expect(result).toEqual({ csv: 'csv,content', farmerName: 'Ram' });
      expect(farmerHelpers.buildCsvStatement).toHaveBeenCalledWith(
        { id: 'F1', name: 'Ram' },
        [{ entry: 1 }]
      );
    });
  });

  describe('generateStatementPdf', () => {
    const res = {}; // passed through to the pdf builder

    test('throws 404 when farmer not found', async () => {
      farmerRepository.getFarmerBasicDetails.mockResolvedValue(null);
      await expect(service.generateStatementPdf('GHOST', res)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    test('uses fallback cold storage details when none found', async () => {
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ id: 'F1', coldStorageId: 'CS1' });
      farmerRepository.getColdStorageDetailsForFarmer.mockResolvedValue(null);
      farmerRepository.getFarmerLedger.mockResolvedValue([]);
      farmerRepository.getPaymentsForFarmer.mockResolvedValue([]);

      await service.generateStatementPdf('F1', res);
      expect(farmerHelpers.buildPdfStatement).toHaveBeenCalledWith(
        res,
        expect.any(Object),
        expect.objectContaining({ displayName: 'Annsetu Cold Storage' }),
        [],
        []
      );
    });

    test('passes real cold storage, ledger, and payments to the pdf builder', async () => {
      const cs = { displayName: 'Sharma CS', address: 'Agra', phone: '111' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ id: 'F1', coldStorageId: 'CS1' });
      farmerRepository.getColdStorageDetailsForFarmer.mockResolvedValue(cs);
      farmerRepository.getFarmerLedger.mockResolvedValue([{ l: 1 }]);
      farmerRepository.getPaymentsForFarmer.mockResolvedValue([{ p: 1 }]);

      await service.generateStatementPdf('F1', res);
      expect(farmerHelpers.buildPdfStatement).toHaveBeenCalledWith(
        res, expect.any(Object), cs, [{ l: 1 }], [{ p: 1 }]
      );
    });
  });
});