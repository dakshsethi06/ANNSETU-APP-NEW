const db = require('../config/database');
const { verifyManualPayment } = require('../modules/payment/payment.manual.controller');

jest.mock('../config/database', () => ({
  connect: jest.fn()
}));

jest.mock('../shared/notifications/notifications', () => ({
  createAppNotification: jest.fn()
}));

describe('verifyManualPayment Database Schema Adjustments Unit Tests', () => {
  let mockClient;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    db.connect.mockResolvedValue(mockClient);

    mockReq = {
      body: {
        paymentId: 'pay_123',
        utrNumber: 'UTR123456789012',
        receiptFile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        paymentDate: '2026-07-08',
        paymentMode: 'UPI',
        bankName: 'HDFC Bank'
      },
      headers: { host: 'localhost:3001' },
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3001')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('should write receipt path to receiptUrl column instead of note column', async () => {
    // 1. Mock DB query responses for checks inside verifyManualPayment
    // First query: fetch farmerId and amount
    mockClient.query.mockImplementation(async (sql, params) => {
      if (sql.includes('SELECT * FROM "Payment"')) {
        return { rows: [{ farmerId: 'farmer_abc', amount: 500, coldStorageId: 'cs_123' }] };
      }
      if (sql.includes('SELECT name FROM "Farmer"')) {
        return { rows: [{ name: 'Tejas Partner' }] };
      }
      if (sql.includes('SELECT id FROM "Payment" WHERE "reference" = $1')) {
        return { rows: [] }; // No duplicate UTR
      }
      return { rows: [] };
    });

    await verifyManualPayment(mockReq, mockRes);

    // 2. Verify client.release was called
    expect(mockClient.release).toHaveBeenCalled();

    // 3. Verify SQL UPDATE statement includes receiptUrl and not note
    let updateQueryFound = false;
    for (const call of mockClient.query.mock.calls) {
      const sql = call[0];
      if (sql.includes('UPDATE "Payment"')) {
        updateQueryFound = true;
        expect(sql).toContain('receiptUrl');
        expect(sql).not.toContain('"note" =');
      }
    }
    expect(updateQueryFound).toBe(true);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});
