const db = require('../../../config/database');
const voucherController = require('../voucher.controller');
const voucherService = require('../voucher.service');
const farmerRepository = require('../../farmer/farmer.repository');

jest.mock('../../../config/database', () => ({
  connect: jest.fn()
}));

jest.mock('../voucher.service', () => ({
  validateAndCalculateDiscount: jest.fn(),
  redeemVoucherTransaction: jest.fn()
}));

jest.mock('../../farmer/farmer.repository', () => ({
  getFarmerBasicDetails: jest.fn()
}));

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Voucher Controller Tests', () => {
  let req, res, mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {} };
    res = mockRes();
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };
    db.connect.mockResolvedValue(mockClient);
  });

  describe('applyVoucher', () => {
    test('returns 404 if farmer not found', async () => {
      req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce(null);

      await voucherController.applyVoucher(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Farmer not found.' }));
    });

    test('returns success with calculation payload if voucher is valid', async () => {
      req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ id: 'F1', coldStorageId: 'CS1' });
      voucherService.validateAndCalculateDiscount.mockResolvedValueOnce({
        voucher: { code: 'SAVE50', type: 'FLAT' },
        discountAmount: 50,
        netAmount: 50
      });

      await voucherController.applyVoucher(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        voucherCode: 'SAVE50',
        type: 'FLAT',
        discountAmount: 50,
        netAmount: 50,
        message: expect.any(String)
      });
    });

    test('returns 400 if service throws error', async () => {
      req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ id: 'F1', coldStorageId: 'CS1' });
      voucherService.validateAndCalculateDiscount.mockRejectedValueOnce(new Error('Voucher has expired.'));

      await voucherController.applyVoucher(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Voucher has expired.' });
    });
  });

  describe('redeemVoucher', () => {
    test('returns 404 if farmer not found', async () => {
      req.body = { voucherCode: 'SAVE100', amount: 100, farmerId: 'F1' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce(null);

      await voucherController.redeemVoucher(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('returns 400 if netAmount is greater than 0', async () => {
      req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ id: 'F1', coldStorageId: 'CS1' });
      voucherService.validateAndCalculateDiscount.mockResolvedValueOnce({
        netAmount: 50
      });

      await voucherController.redeemVoucher(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('does not cover the full payment amount')
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('processes full redemption successfully when netAmount is 0', async () => {
      req.body = { voucherCode: 'SAVE100', amount: 100, farmerId: 'F1' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ id: 'F1', coldStorageId: 'CS1' });
      voucherService.validateAndCalculateDiscount.mockResolvedValueOnce({
        netAmount: 0
      });
      voucherService.redeemVoucherTransaction.mockResolvedValueOnce(60);

      // Mock queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // for BEGIN
        .mockResolvedValueOnce({ // for SELECT FROM NikasiTransaction
          rows: [
            { id: 'tx1', balanceDueAmount: '40.00', paidAmount: '0.00' },
            { id: 'tx2', balanceDueAmount: '40.00', paidAmount: '0.00' },
            { id: 'tx3', balanceDueAmount: '40.00', paidAmount: '0.00' }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }) // for UPDATE tx1
        .mockResolvedValueOnce({ rows: [] }) // for UPDATE tx2
        .mockResolvedValueOnce({ rows: [] }) // for INSERT Payment
        .mockResolvedValueOnce({ rows: [] }); // for COMMIT

      await voucherController.redeemVoucher(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(voucherService.redeemVoucherTransaction).toHaveBeenCalledWith(
        'SAVE100', 'F1', 100, expect.any(String), mockClient
      );
      // Verify dues allocation (update 2 rows, tx3 is skipped because discount is fully consumed)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "NikasiTransaction"'),
        [0, 40, 'tx1']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "NikasiTransaction"'),
        [20, 20, 'tx2']
      );
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "NikasiTransaction"'),
        expect.arrayContaining(['tx3'])
      );
      // Verify Payment record insertion
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "Payment"'),
        expect.arrayContaining(['SAVE100', 60])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        paymentId: expect.any(String)
      });
    });

    test('performs rollback on error', async () => {
      req.body = { voucherCode: 'SAVE100', amount: 100, farmerId: 'F1' };
      farmerRepository.getFarmerBasicDetails.mockResolvedValueOnce({ id: 'F1', coldStorageId: 'CS1' });
      voucherService.validateAndCalculateDiscount.mockResolvedValueOnce({
        netAmount: 0
      });
      voucherService.redeemVoucherTransaction.mockRejectedValueOnce(new Error('Redemption error'));

      await voucherController.redeemVoucher(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Redemption error' });
    });
  });
});
