jest.mock('../farmer.repository');
jest.mock('../pdf.service', () => ({
  buildStatementPdf: jest.fn(),
  buildReceiptPdf: jest.fn()
}));
jest.mock('../../../shared/notifications/notifications', () => ({
  logOutboundNotification: jest.fn().mockResolvedValue({}),
  createAppNotification: jest.fn().mockResolvedValue({})
}));
jest.mock('../../../shared/notifications', () => ({
  sendSMS: jest.fn().mockResolvedValue({}),
  sendEmail: jest.fn().mockResolvedValue({})
}));
jest.mock('../../../shared/utils/otpUtils', () => ({
  verifySupabaseOtp: jest.fn()
}));

const farmerRepository = require('../farmer.repository');
const pdfService = require('../pdf.service');
const { logOutboundNotification, createAppNotification } = require('../../../shared/notifications/notifications');
const { sendSMS, sendEmail } = require('../../../shared/notifications');
const { verifySupabaseOtp } = require('../../../shared/utils/otpUtils');

const { getFarmers } = require('../controllers/getFarmers.controller');
const { registerFarmer } = require('../controllers/registerFarmer.controller');
const { getLedger } = require('../controllers/getLedger.controller');
const { loginMpin } = require('../controllers/loginMpin.controller');
const { resetMpin } = require('../controllers/resetMpin.controller');
const { downloadStatement } = require('../controllers/downloadStatement.controller');
const { downloadStatementPdf } = require('../controllers/downloadStatementPdf.controller');
const { downloadReceiptPdf } = require('../controllers/downloadReceiptPdf.controller');
const { updateFarmer } = require('../controllers/updateFarmer.controller');
const { sendProfileOtp } = require('../controllers/sendProfileOtp.controller');
const { verifyAndUpdateProfile } = require('../controllers/verifyAndUpdateProfile.controller');

const dateHelpers = require('../controllers/dateHelpers');
const mpinHelpers = require('../controllers/mpinHelpers');

const db = require('../../../config/database');

describe('Farmer Controllers', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn()
    };
  });

  describe('dateHelpers', () => {
    test('parseToISODate behaves correctly', () => {
      expect(dateHelpers.parseToISODate(undefined)).toBeNull();
      expect(dateHelpers.parseToISODate('undefined')).toBeNull();
      expect(dateHelpers.parseToISODate('2026-07-14')).toBe('2026-07-14');
      expect(dateHelpers.parseToISODate('14-07-2026')).toBe('2026-07-14');
      expect(dateHelpers.parseToISODate('2026/07/14')).toBe('2026-07-14');
      expect(dateHelpers.parseToISODate('invalid')).toBeNull();
    });

    test('toISTDateStr behaves correctly', () => {
      expect(dateHelpers.toISTDateStr(undefined)).toBe('');
      expect(dateHelpers.toISTDateStr('invalid')).toBe('');
      expect(dateHelpers.toISTDateStr('2026-07-14T12:00:00Z')).toBe('2026-07-14');
    });

    test('parseAndFormat behaves correctly', () => {
      expect(dateHelpers.parseAndFormat('2026-07-14')).toContain('Jul');
      expect(dateHelpers.parseAndFormat('invalid')).toBe('invalid');
    });
  });

  describe('mpinHelpers', () => {
    test('exports hashMpin and verifyMpin', () => {
      expect(mpinHelpers.hashMpin).toBeDefined();
      expect(mpinHelpers.verifyMpin).toBeDefined();
    });
  });

  describe('getFarmers controller', () => {
    it('returns success and farmers list', async () => {
      req = { query: { state: 'UP', serial_number: 'SN1' } };
      farmerRepository.getFarmersData.mockResolvedValue([{ id: '1' }]);
      await getFarmers(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, farmers: [{ id: '1' }] });
    });

    it('returns 500 on repository error', async () => {
      req = { query: {} };
      farmerRepository.getFarmersData.mockRejectedValue(new Error('DB Fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await getFarmers(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('getLedger controller', () => {
    it('returns success and ledger list', async () => {
      req = { params: { id: 'F1' } };
      farmerRepository.getFarmerLedger.mockResolvedValue([{ entry: 1 }]);
      await getLedger(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, ledger: [{ entry: 1 }] });
    });

    it('returns 500 on repository error', async () => {
      req = { params: { id: 'F1' } };
      farmerRepository.getFarmerLedger.mockRejectedValue(new Error('DB Fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await getLedger(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('registerFarmer controller', () => {
    it('returns 400 if serial_number or name is missing', async () => {
      req = { body: { name: 'Ram' } };
      await registerFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req = { body: { serial_number: 'SN1' } };
      await registerFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 if coldStorageId is missing', async () => {
      req = { body: { serial_number: 'SN1', name: 'Ram' } };
      await registerFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates farmer record and returns 201', async () => {
      req = { body: { serial_number: 'SN1', name: 'Ram', coldStorageId: 'CS1', phone: '9876543210' } };
      farmerRepository.createFarmerRecord.mockResolvedValue({});
      await registerFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(logOutboundNotification).toHaveBeenCalled();
    });

    it('creates farmer even if notification fails', async () => {
      req = { body: { serial_number: 'SN1', name: 'Ram', coldStorageId: 'CS1' } };
      farmerRepository.createFarmerRecord.mockResolvedValue({});
      logOutboundNotification.mockRejectedValue(new Error('SMS fail'));
      await registerFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 if duplicate serial number error is thrown', async () => {
      req = { body: { serial_number: 'SN1', name: 'Ram', coldStorageId: 'CS1' } };
      const err = new Error('Duplicate');
      err.code = '23505';
      farmerRepository.createFarmerRecord.mockRejectedValue(err);
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await registerFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('already exists') }));
      spy.mockRestore();
    });

    it('returns 500 on other errors', async () => {
      req = { body: { serial_number: 'SN1', name: 'Ram', coldStorageId: 'CS1' } };
      farmerRepository.createFarmerRecord.mockRejectedValue(new Error('Generic Error'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await registerFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('loginMpin controller', () => {
    it('returns 400 if phone or mpin is missing', async () => {
      req = { body: { phone: '123' } };
      await loginMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('authenticates cold storage role with correct credentials', async () => {
      req = { body: { phone: '123', mpin: '1234', role: 'ColdStorageFacility' } };
      const mockCS = { id: 'CS1', displayName: 'CS', mpin: mpinHelpers.hashMpin('1234'), account_status: 'ACTIVE' };
      farmerRepository.getColdStorageByPhone.mockResolvedValue(mockCS);

      await loginMpin(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        role: 'ColdStorageFacility',
        token: expect.any(String)
      }));
    });

    it('returns 403 if cold storage is suspended', async () => {
      req = { body: { phone: '123', mpin: '1234', role: 'ColdStorageFacility' } };
      const mockCS = { id: 'CS1', displayName: 'CS', account_status: 'SUSPENDED' };
      farmerRepository.getColdStorageByPhone.mockResolvedValue(mockCS);

      await loginMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 401 if cold storage mpin is invalid', async () => {
      req = { body: { phone: '123', mpin: 'wrong', role: 'ColdStorageFacility' } };
      const mockCS = { id: 'CS1', displayName: 'CS', mpin: mpinHelpers.hashMpin('1234'), account_status: 'ACTIVE' };
      farmerRepository.getColdStorageByPhone.mockResolvedValue(mockCS);

      await loginMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('authenticates farmer role with correct credentials', async () => {
      req = { body: { phone: '123', mpin: '1234', role: 'farmer' } };
      const mockFarmer = { id: 'F1', name: 'Ram', phone: '123', state: 'UP', mpin: mpinHelpers.hashMpin('1234'), account_status: 'ACTIVE' };
      farmerRepository.getFarmerByPhone.mockResolvedValue(mockFarmer);

      await loginMpin(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        role: 'ColdStorage',
        token: expect.any(String)
      }));
    });

    it('returns 403 if farmer is suspended', async () => {
      req = { body: { phone: '123', mpin: '1234', role: 'farmer' } };
      const mockFarmer = { id: 'F1', account_status: 'SUSPENDED' };
      farmerRepository.getFarmerByPhone.mockResolvedValue(mockFarmer);

      await loginMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 401 if farmer is not found or wrong mpin', async () => {
      req = { body: { phone: '123', mpin: '1234', role: 'farmer' } };
      farmerRepository.getFarmerByPhone.mockResolvedValue(null);

      await loginMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 500 on login error', async () => {
      req = { body: { phone: '123', mpin: '1234' } };
      farmerRepository.getColdStorageByPhone.mockRejectedValue(new Error('DB fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await loginMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('resetMpin controller', () => {
    it('returns 400 if params are missing or newMpin is too short', async () => {
      req = { body: { phone: '123', otp: '111' } };
      await resetMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req = { body: { phone: '123', otp: '111', newMpin: '12' } };
      await resetMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 if OTP verification fails', async () => {
      req = { body: { phone: '123', otp: 'wrong', newMpin: '1234' } };
      verifySupabaseOtp.mockRejectedValue(new Error('Invalid OTP'));

      await resetMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('resets Cold Storage mpin if CS account exists', async () => {
      req = { body: { phone: '123', otp: '111111', newMpin: '1234' } };
      verifySupabaseOtp.mockResolvedValue({});
      farmerRepository.getColdStorageByPhone.mockResolvedValue({ id: 'CS1' });

      await resetMpin(req, res);
      expect(farmerRepository.updateColdStorageMpin).toHaveBeenCalledWith('CS1', expect.any(String));
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'MPIN reset successfully.' });
    });

    it('resets Farmer mpin if Farmer account exists and CS does not', async () => {
      req = { body: { phone: '123', otp: '111111', newMpin: '1234' } };
      verifySupabaseOtp.mockResolvedValue({});
      farmerRepository.getColdStorageByPhone.mockResolvedValue(null);
      farmerRepository.getFarmerByPhone.mockResolvedValue({ id: 'F1' });

      await resetMpin(req, res);
      expect(farmerRepository.updateFarmerMpin).toHaveBeenCalledWith('F1', expect.any(String));
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'MPIN reset successfully.' });
    });

    it('returns 404 if farmer is not found during reset', async () => {
      req = { body: { phone: '123', otp: '111111', newMpin: '1234' } };
      verifySupabaseOtp.mockResolvedValue({});
      farmerRepository.getColdStorageByPhone.mockResolvedValue(null);
      farmerRepository.getFarmerByPhone.mockResolvedValue(null);

      await resetMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on repository fail', async () => {
      req = { body: { phone: '123', otp: '111111', newMpin: '1234' } };
      verifySupabaseOtp.mockResolvedValue({});
      farmerRepository.getColdStorageByPhone.mockRejectedValue(new Error('Fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await resetMpin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('downloadStatement controller', () => {
    it('returns 404 if farmer is not found', async () => {
      req = { params: { id: 'F1' }, query: {} };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue(null);
      await downloadStatement(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('sends csv response for statements', async () => {
      req = { params: { id: 'F1' }, query: { fromDate: '2026-07-01', toDate: '2026-07-10' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Ram', phone: '123', openingBalance: 100 });
      farmerRepository.getFarmerLedger.mockResolvedValue([
        { date: '2026-07-05T10:00:00.000Z', amount: -50, balance: 50, title: 'Rent' }
      ]);

      await downloadStatement(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalled();
    });

    it('sends csv response for statements without date filters', async () => {
      req = { params: { id: 'F1' }, query: {} };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Ram', phone: '123', openingBalance: 100 });
      farmerRepository.getFarmerLedger.mockResolvedValue([]);

      await downloadStatement(req, res);
      expect(res.send).toHaveBeenCalled();
    });

    it('returns 500 on failure', async () => {
      req = { params: { id: 'F1' }, query: {} };
      farmerRepository.getFarmerBasicDetails.mockRejectedValue(new Error('fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await downloadStatement(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('downloadStatementPdf controller', () => {
    it('returns 404 if farmer is not found', async () => {
      req = { params: { id: 'F1' }, query: {} };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue(null);
      await downloadStatementPdf(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('generates PDF statement successfully with date range and existing entries before range', async () => {
      req = { params: { id: 'F1' }, query: { fromDate: '2026-07-05', toDate: '2026-07-10' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Ram', phone: '123', coldStorageId: 'CS1', openingBalance: 100 });
      farmerRepository.getColdStorageDetailsForFarmer.mockResolvedValue({ displayName: 'CS', address: 'Tundla', phone: '999' });
      farmerRepository.getFarmerLedger.mockResolvedValue([
        { date: '2026-07-02T10:00:00.000Z', amount: -50, balance: 50, title: 'Rent' },
        { date: '2026-07-06T10:00:00.000Z', amount: -50, balance: 0, title: 'Rent' }
      ]);
      farmerRepository.getPaymentsForFarmer.mockResolvedValue([]);

      await downloadStatementPdf(req, res);
      expect(pdfService.buildStatementPdf).toHaveBeenCalled();
    });

    it('generates PDF statement without dates and uses default CS details if null', async () => {
      req = { params: { id: 'F1' }, query: {} };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Ram', phone: '123', coldStorageId: 'CS1', openingBalance: 100 });
      farmerRepository.getColdStorageDetailsForFarmer.mockResolvedValue(null);
      farmerRepository.getFarmerLedger.mockResolvedValue([]);
      farmerRepository.getPaymentsForFarmer.mockResolvedValue([]);

      await downloadStatementPdf(req, res);
      expect(pdfService.buildStatementPdf).toHaveBeenCalled();
    });

    it('returns 500 on PDF statement error', async () => {
      req = { params: { id: 'F1' }, query: {} };
      farmerRepository.getFarmerBasicDetails.mockRejectedValue(new Error('fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await downloadStatementPdf(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('downloadReceiptPdf controller', () => {
    it('returns 400 if required parameters are missing', async () => {
      req = { params: { id: 'F1' }, query: {} };
      await downloadReceiptPdf(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 if farmer is not found', async () => {
      req = { params: { id: 'F1' }, query: { entryId: '1', fromDate: '2026-07-01', toDate: '2026-07-10' } };
      jest.spyOn(db, 'query').mockResolvedValue({ rows: [] });

      await downloadReceiptPdf(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      db.query.mockRestore();
    });

    it('returns 404 if entry is not found in ledger', async () => {
      req = { params: { id: 'F1' }, query: { entryId: 'unknown', fromDate: '2026-07-01', toDate: '2026-07-10' } };
      jest.spyOn(db, 'query').mockImplementation((sql, params) => {
        if (sql.includes('FROM "Farmer"')) return Promise.resolve({ rows: [{ coldStorageId: 'CS1' }] });
        if (sql.includes('FROM "ColdStorageOnboarding"')) return Promise.resolve({ rows: [{ displayName: 'CS' }] });
        return Promise.resolve({ rows: [] });
      });
      farmerRepository.getFarmerLedger.mockResolvedValue([]);

      await downloadReceiptPdf(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      db.query.mockRestore();
    });

    it('generates receipt PDF successfully', async () => {
      req = { params: { id: 'F1' }, query: { entryId: 'tx-1', fromDate: '2026-07-01', toDate: '2026-07-10' } };
      jest.spyOn(db, 'query').mockImplementation((sql, params) => {
        if (sql.includes('FROM "Farmer"')) return Promise.resolve({ rows: [{ coldStorageId: 'CS1' }] });
        if (sql.includes('FROM "ColdStorageOnboarding"')) return Promise.resolve({ rows: [{ displayName: 'CS' }] });
        return Promise.resolve({ rows: [] });
      });
      farmerRepository.getFarmerLedger.mockResolvedValue([
        { id: 'tx-1', date: '2026-07-05T10:00:00.000Z', amount: -500, balance: 500, title: 'Rent' }
      ]);

      await downloadReceiptPdf(req, res);
      expect(pdfService.buildReceiptPdf).toHaveBeenCalled();
      db.query.mockRestore();
    });

    it('returns 500 on receipt PDF failure', async () => {
      req = { params: { id: 'F1' }, query: { entryId: 'tx-1', fromDate: '2026-07-01', toDate: '2026-07-10' } };
      jest.spyOn(db, 'query').mockRejectedValue(new Error('fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await downloadReceiptPdf(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
      db.query.mockRestore();
    });
  });

  describe('updateFarmer controller', () => {
    it('returns 404 if farmer is not found', async () => {
      req = { params: { id: 'F1' }, body: {} };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue(null);
      await updateFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates farmer profile details using request body parameters or current details', async () => {
      req = { params: { id: 'F1' }, body: { name: 'New Name' } };
      const current = { name: 'Old Name', phone: '123', email: 'a@a.com', aadhaarNumber: '1', panNumber: 'P' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue(current);
      farmerRepository.updateFarmerBasicDetails.mockResolvedValue({ id: 'F1', name: 'New Name' });

      await updateFarmer(req, res);
      expect(farmerRepository.updateFarmerBasicDetails).toHaveBeenCalledWith('F1', 'New Name', '123', 'a@a.com', '1', 'P');
      expect(res.json).toHaveBeenCalledWith({ success: true, farmer: { id: 'F1', name: 'New Name' } });
    });

    it('returns 500 on update failure', async () => {
      req = { params: { id: 'F1' }, body: {} };
      farmerRepository.getFarmerBasicDetails.mockRejectedValue(new Error('fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await updateFarmer(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('sendProfileOtp controller', () => {
    it('returns 400 if target values are missing or targetType is invalid', async () => {
      req = { body: { id: 'F1', targetType: 'phone' } };
      await sendProfileOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req = { body: { id: 'F1', targetType: 'invalid', targetValue: 'val' } };
      await sendProfileOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 if farmer not found', async () => {
      req = { body: { id: 'F1', targetType: 'phone', targetValue: '9876543210' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue(null);

      await sendProfileOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('sends SMS and email successfully if targets are present', async () => {
      req = { body: { id: 'F1', targetType: 'phone', targetValue: '9876543210' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ id: 'F1', phone: '9876543210', email: 'test@email.com' });

      await sendProfileOtp(req, res);
      expect(sendSMS).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Verification OTP sent successfully.' });
    });

    it('throws error and returns 500 if both SMS and email delivery fail', async () => {
      req = { body: { id: 'F1', targetType: 'phone', targetValue: '9876543210' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ id: 'F1', phone: '9876543210', email: 'test@email.com' });
      sendSMS.mockRejectedValue(new Error('SMS fail'));
      sendEmail.mockRejectedValue(new Error('Email fail'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await sendProfileOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });

  describe('verifyAndUpdateProfile controller', () => {
    it('returns 400 if required parameters are missing', async () => {
      req = { body: { id: 'F1' } };
      await verifyAndUpdateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 if OTP record is missing, mismatch, or wrong target value', async () => {
      req = { body: { id: 'F1', targetType: 'phone', targetValue: '9876543210', otpCode: '111111' } };
      farmerRepository.getOtpVerification.mockResolvedValue(null);

      await verifyAndUpdateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      farmerRepository.getOtpVerification.mockResolvedValue({ code: '222222', targetValue: '9876543210' });
      await verifyAndUpdateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 if farmer basic details not found', async () => {
      req = { body: { id: 'F1', targetType: 'phone', targetValue: '9876543210', otpCode: '111111' } };
      farmerRepository.getOtpVerification.mockResolvedValue({ code: '111111', targetValue: '9876543210' });
      farmerRepository.getFarmerBasicDetails.mockResolvedValue(null);

      await verifyAndUpdateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates farmer profile details and deletes OTP verification record upon verification', async () => {
      req = { body: { id: 'F1', targetType: 'phone', targetValue: '9876543210', otpCode: '111111' } };
      farmerRepository.getOtpVerification.mockResolvedValue({ code: '111111', targetValue: '9876543210' });
      farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Ram', phone: '111', email: 'test@email.com' });
      farmerRepository.verifyAndUpdateFarmerProfile.mockResolvedValue({ id: 'F1', phone: '9876543210' });

      await verifyAndUpdateProfile(req, res);
      expect(farmerRepository.verifyAndUpdateFarmerProfile).toHaveBeenCalledWith('F1', 'Ram', '9876543210', 'test@email.com');
      expect(farmerRepository.deleteOtpVerification).toHaveBeenCalledWith('F1', 'phone');
      expect(res.json).toHaveBeenCalledWith({ success: true, farmer: { id: 'F1', phone: '9876543210' } });
    });

    it('returns 500 on repository update failure', async () => {
      req = { body: { id: 'F1', targetType: 'phone', targetValue: '9876543210', otpCode: '111111' } };
      farmerRepository.getOtpVerification.mockRejectedValue(new Error('fail'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await verifyAndUpdateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      spy.mockRestore();
    });
  });
});
