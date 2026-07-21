const db = require('../../../config/database');
const { createAppNotification } = require('../../../shared/notifications/notifications');
const { rejectPayment } = require('../payment.reject.controller');

jest.mock('../../../config/database', () => ({
  connect: jest.fn()
}));

jest.mock('../../../shared/notifications/notifications', () => ({
  createAppNotification: jest.fn().mockResolvedValue({})
}));

describe('payment.reject.controller', () => {
  let req, res, mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };
    db.connect.mockResolvedValue(mockClient);
  });

  describe('rejectPayment', () => {
    test('returns 404 if payment record not found', async () => {
      req = { params: { id: 'p1' } };
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT * FROM "Payment"

      await rejectPayment(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Payment record not found' });
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('updates status, cleans up notification, sends warning app notification, and returns success', async () => {
      req = { params: { id: 'p1' } };
      const payment = { id: 'p1', farmerId: 'f1', coldStorageId: 'cs1', amount: 300, reference: 'ref1' };
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // SELECT * FROM "Payment"
        .mockResolvedValueOnce({}) // UPDATE "Payment"
        .mockResolvedValueOnce({}) // DELETE FROM "AppNotification"
        .mockResolvedValueOnce({}); // COMMIT

      await rejectPayment(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('UPDATE "Payment" SET "status" = \'REJECTED\' WHERE id = $1', ['p1']);
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM "AppNotification"'), ['cs1', '%p1']);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(createAppNotification).toHaveBeenCalledWith({
        coldStorageId: 'cs1',
        userId: 'f1',
        lotId: null,
        type: 'warning',
        title: 'Payment Rejected',
        message: expect.stringContaining('₹300'),
        icon: 'x',
        actionUrl: '/khata'
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Payment rejected successfully' });
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('rolls back on database query error', async () => {
      req = { params: { id: 'p1' } };
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Query failed')); // SELECT * FROM "Payment" errors

      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await rejectPayment(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Query failed' });
      expect(spyError).toHaveBeenCalled();
      spyError.mockRestore();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
