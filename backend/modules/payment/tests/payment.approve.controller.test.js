const paymentRepository = require('../payment.repository');
const { createAppNotification } = require('../../../shared/notifications/notifications');
const { getPaymentDetails, approvePayment } = require('../payment.approve.controller');

jest.mock('../payment.repository');
jest.mock('../../../shared/notifications/notifications', () => ({
  createAppNotification: jest.fn().mockResolvedValue({})
}));

describe('payment.approve.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getPaymentDetails', () => {
    test('returns 404 if payment details are not found', async () => {
      req = { params: { id: 'p1' } };
      paymentRepository.getPaymentDetailsWithFarmerInfo.mockResolvedValueOnce(null);

      await getPaymentDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Payment record not found' });
    });

    test('returns 200 and falls back to note if receiptUrl is missing', async () => {
      req = { params: { id: 'p1' } };
      const details = {
        payment: {
          id: 'p1',
          farmerId: 'f1',
          coldStorageId: 'cs1',
          amount: 500.00,
          status: 'PENDING',
          paymentMode: 'UPI',
          reference: 'ref1',
          note: 'My note fallback',
          createdAt: '2026-07-14T10:00:00Z'
        },
        farmer: { name: 'Ram', phone: '123' },
        csName: 'Best CS'
      };
      paymentRepository.getPaymentDetailsWithFarmerInfo.mockResolvedValueOnce(details);

      await getPaymentDetails(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        payment: expect.objectContaining({
          receiptFile: 'My note fallback'
        })
      }));
    });


    test('returns 200 and formatted payment details if found', async () => {
      req = { params: { id: 'p1' } };
      const details = {
        payment: {
          id: 'p1',
          farmerId: 'f1',
          coldStorageId: 'cs1',
          amount: 500.00,
          status: 'PENDING',
          paymentMode: 'UPI',
          reference: 'ref1',
          receiptUrl: 'path/to/receipt',
          createdAt: '2026-07-14T10:00:00Z'
        },
        farmer: { name: 'Ram', phone: '123' },
        csName: 'Best CS'
      };
      paymentRepository.getPaymentDetailsWithFarmerInfo.mockResolvedValueOnce(details);

      await getPaymentDetails(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payment: {
          id: 'p1',
          farmerId: 'f1',
          farmerName: 'Ram',
          farmerPhone: '123',
          coldStorageId: 'cs1',
          coldStorageName: 'Best CS',
          amount: 500.00,
          status: 'PENDING',
          paymentMode: 'UPI',
          reference: 'ref1',
          receiptFile: 'path/to/receipt',
          createdAt: '2026-07-14T10:00:00Z'
        }
      });
    });

    test('returns 500 on database error', async () => {
      req = { params: { id: 'p1' } };
      paymentRepository.getPaymentDetailsWithFarmerInfo.mockRejectedValueOnce(new Error('DB Error'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await getPaymentDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'DB Error' });
      expect(spyError).toHaveBeenCalled();
      spyError.mockRestore();
    });
  });

  describe('approvePayment', () => {
    test('returns repository error status and message if txResult is not success', async () => {
      req = { params: { id: 'p1' } };
      paymentRepository.approvePaymentTx.mockResolvedValueOnce({
        success: false,
        status: 400,
        error: 'Payment already processed'
      });

      await approvePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Payment already processed' });
    });

    test('returns default 500 if status not provided in failed txResult', async () => {
      req = { params: { id: 'p1' } };
      paymentRepository.approvePaymentTx.mockResolvedValueOnce({
        success: false,
        error: 'Unknown error'
      });

      await approvePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unknown error' });
    });

    test('approves payment, sends app notification, and returns success', async () => {
      req = { params: { id: 'p1' } };
      const payment = { id: 'p1', coldStorageId: 'cs1', farmerId: 'f1', amount: '250.00', reference: 'ref1' };
      paymentRepository.approvePaymentTx.mockResolvedValueOnce({
        success: true,
        payment
      });

      await approvePayment(req, res);

      expect(createAppNotification).toHaveBeenCalledWith({
        coldStorageId: 'cs1',
        userId: 'f1',
        lotId: null,
        type: 'info',
        title: 'Payment Approved',
        message: expect.stringContaining('₹250'),
        icon: 'check',
        actionUrl: '/khata'
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Payment approved successfully' });
    });

    test('returns 500 on database error during approval', async () => {
      req = { params: { id: 'p1' } };
      paymentRepository.approvePaymentTx.mockRejectedValueOnce(new Error('Approval failure'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await approvePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Approval failure' });
      expect(spyError).toHaveBeenCalled();
      spyError.mockRestore();
    });
  });
});
