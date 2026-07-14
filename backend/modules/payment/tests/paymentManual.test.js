const db = require('../../../config/database');
const fs = require('fs');
const path = require('path');
const { initiatePayment, verifyManualPayment } = require('../payment.manual.controller');
const paymentRepository = require('../payment.repository');
const farmerRepository = require('../../farmer/farmer.repository');
const { createAppNotification } = require('../../../shared/notifications/notifications');

jest.mock('../../../config/database', () => ({
  connect: jest.fn(),
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

jest.mock('../payment.repository');
jest.mock('../../farmer/farmer.repository');

jest.mock('../../../shared/notifications/notifications', () => ({
  createAppNotification: jest.fn().mockResolvedValue({})
}));

describe('payment.manual.controller unit tests', () => {
  let req, res, spyStatus, spyJson;

  beforeEach(() => {
    jest.clearAllMocks();
    spyStatus = jest.fn().mockReturnThis();
    spyJson = jest.fn();
    res = {
      status: spyStatus,
      json: spyJson
    };
  });

  describe('initiatePayment', () => {
    test('returns 400 if coldStorageId is missing', async () => {
      req = { body: { amount: 100, farmerId: 'f1', paymentMode: 'MANUAL' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ name: 'Ram Singh', coldStorageId: null });
      await initiatePayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'coldStorageId is required.' }));
    });

    test('returns 404 if farmer is not found', async () => {
      req = { body: { farmerId: 'f1', amount: 100, coldStorageId: 'CS1', paymentMode: 'MANUAL' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce(null);
      await initiatePayment(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('initiates manual payment successfully when paymentMode is MANUAL', async () => {
      req = { body: { farmerId: 'f1', amount: 100, coldStorageId: 'CS1', paymentMode: 'MANUAL' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ name: 'Ram Singh', coldStorageId: 'CS1' });
      paymentRepository.initiateManualPayment.mockResolvedValueOnce({ id: 'PAY123' });

      await initiatePayment(req, res);

      expect(paymentRepository.initiateManualPayment).toHaveBeenCalledWith(expect.any(String), 'f1', 'CS1', 100, 'MANUAL');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, payment: { id: 'PAY123' } }));
    });

    test('initiates online payment successfully when paymentMode is ONLINE or undefined', async () => {
      req = { body: { farmerId: 'f1', amount: 100, coldStorageId: 'CS1' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ name: 'Ram Singh', coldStorageId: 'CS1' });
      paymentRepository.initiateManualPayment.mockResolvedValueOnce({ id: 'PAY456' });

      await initiatePayment(req, res);

      expect(paymentRepository.initiateManualPayment).toHaveBeenCalledWith(expect.any(String), 'f1', 'CS1', 100, 'online');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, payment: { id: 'PAY456' } }));
    });

    test('returns 500 when database initiation fails', async () => {
      req = { body: { farmerId: 'f1', amount: 100, coldStorageId: 'CS1', paymentMode: 'MANUAL' } };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ name: 'Ram' });
      paymentRepository.initiateManualPayment.mockRejectedValueOnce(new Error('DB error'));

      await initiatePayment(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('verifyManualPayment', () => {
    test('returns 400 if paymentId is missing or invalid format', async () => {
      req = { body: { paymentId: '' } };
      await verifyManualPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid payment ID format' }));
    });

    test('returns 200 with error if UTR format check fails and sends warning notification if payment exists', async () => {
      req = {
        body: {
          paymentId: 'PAY123',
          utrNumber: 'INVALID_UTR', // invalid UTR format
          paymentDate: '2026-07-14',
          paymentMode: 'MANUAL',
          bankName: 'SBI'
        }
      };

      paymentRepository.getPaymentById.mockResolvedValueOnce({
        coldStorageId: 'cs1',
        farmerId: 'farmer1'
      });

      await verifyManualPayment(req, res);

      expect(paymentRepository.getPaymentById).toHaveBeenCalledWith('PAY123');
      expect(createAppNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'warning',
        title: 'Payment Details Incorrect'
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        preCheckFailed: true,
        error: 'Invalid UTR format. It must be between 12 and 22 alphanumeric characters.'
      }));
    });

    test.each(['jpeg', 'pdf', 'webp', 'png'])('saves base64 receipt files with correct extension (%s)', async (ext) => {
      req = {
        body: {
          paymentId: 'PAY123',
          utrNumber: 'UTR123456789012', // Valid 15 chars
          receiptFile: `data:image/${ext};base64,dGVzdA==`,
          paymentDate: '2026-07-14',
          paymentMode: 'MANUAL',
          bankName: 'SBI'
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001')
      };
      
      const spyExists = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const spyMkdir = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      const spyWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      paymentRepository.verifyManualPaymentTx.mockResolvedValueOnce({
        success: true,
        payment: { id: 'PAY123', farmerId: 'f1', coldStorageId: 'cs1', amount: '100.00' }
      });
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ name: 'Ram Singh' });

      await verifyManualPayment(req, res);

      expect(spyWrite).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`receipt_PAY123_.*\\.${ext === 'jpeg' ? 'jpg' : ext}$`)), expect.any(Buffer));
      expect(createAppNotification).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Payment Verification Required'
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Payment verification submitted successfully'
      }));

      spyExists.mockRestore();
      spyMkdir.mockRestore();
      spyWrite.mockRestore();
    });

    test('falls back to png extension for invalid base64 prefix', async () => {
      req = {
        body: {
          paymentId: 'PAY123',
          utrNumber: 'UTR123456789012',
          receiptFile: `data:invalid/mime;base64,dGVzdA==`,
          paymentDate: '2026-07-14',
          paymentMode: 'MANUAL',
          bankName: 'SBI'
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001')
      };
      
      const spyExists = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const spyMkdir = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      const spyWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      paymentRepository.verifyManualPaymentTx.mockResolvedValueOnce({
        success: true,
        payment: { id: 'PAY123', farmerId: 'f1', coldStorageId: 'cs1', amount: '100.00' }
      });
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce(null); // falls back to 'Farmer'

      await verifyManualPayment(req, res);

      expect(spyWrite).toHaveBeenCalledWith(expect.stringMatching(/receipt_PAY123_.*\.png$/), expect.any(Buffer));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

      spyExists.mockRestore();
      spyMkdir.mockRestore();
      spyWrite.mockRestore();
    });

    test('returns preCheckFailed and 200 status on duplicate UTR reference from transaction result', async () => {
      req = {
        body: {
          paymentId: 'PAY123',
          utrNumber: 'UTR123456789012',
          receiptFile: 'data:image/png;base64,dGVzdA==',
          paymentDate: '2026-07-14',
          paymentMode: 'MANUAL',
          bankName: 'SBI'
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001')
      };

      const spyWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      paymentRepository.verifyManualPaymentTx.mockResolvedValueOnce({
        success: false,
        duplicate: true,
        payment: { coldStorageId: 'cs1', farmerId: 'farmer1' }
      });

      await verifyManualPayment(req, res);

      expect(createAppNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'warning',
        title: 'Payment Details Incorrect'
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        preCheckFailed: true,
        error: 'Duplicate UTR. This transaction reference has already been used.'
      }));

      spyWrite.mockRestore();
    });

    test('returns status code returned from repository if verifyManualPaymentTx fails with other status', async () => {
      req = {
        body: {
          paymentId: 'PAY123',
          utrNumber: 'UTR123456789012',
          receiptFile: 'data:image/png;base64,dGVzdA==',
          paymentDate: '2026-07-14',
          paymentMode: 'MANUAL',
          bankName: 'SBI'
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001')
      };

      const spyWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      paymentRepository.verifyManualPaymentTx.mockResolvedValueOnce({ success: false, status: 404, error: 'Custom error' });

      await verifyManualPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Custom error' }));

      spyWrite.mockRestore();
    });

    test('returns 500 when transaction error is thrown during verification', async () => {
      req = {
        body: {
          paymentId: 'PAY123',
          utrNumber: 'UTR123456789012',
          receiptFile: 'data:image/png;base64,dGVzdA==',
          paymentDate: '2026-07-14',
          paymentMode: 'MANUAL',
          bankName: 'SBI'
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001')
      };

      const spyWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      paymentRepository.verifyManualPaymentTx.mockRejectedValueOnce(new Error('Tx Failed'));

      await verifyManualPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Tx Failed' }));

      spyWrite.mockRestore();
    });
  });
});
