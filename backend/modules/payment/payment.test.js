const db = require('../../config/database');
const paymentRepository = require('./payment.repository');
const razorpayService = require('./razorpay.service');
const createOrder = require('./payment.create.controller');

jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

jest.mock('./payment.repository', () => ({
  getFarmerPendingRent: jest.fn(),
  createPendingPayment: jest.fn()
}));

jest.mock('./razorpay.service', () => ({
  isMockMode: jest.fn(),
  createOrder: jest.fn(),
  createPaymentLink: jest.fn(),
  keyId: 'rzp_test_mockkey'
}));

describe('Payment Checkout Capping Unit Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: { farmerId: 'farmer_123', amount: '1000' },
      headers: { host: 'localhost:3001' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('should cap payment amount to pending dues if amount exceeds dues', async () => {
    // Mock pending dues to be 600 (less than payment amount of 1000)
    paymentRepository.getFarmerPendingRent.mockResolvedValue(600);
    db.query.mockResolvedValue({ rows: [{ name: 'Farmer Tejas', phone: '9010090100', coldStorageId: 'cs_onboarding_123' }] });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    // Assert that the Razorpay order was created with capped dues * 100 in paise (600 * 100 = 60000)
    expect(razorpayService.createOrder).toHaveBeenCalledWith(60000, expect.any(String));

    // Assert createPendingPayment was called with capped amount
    expect(paymentRepository.createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 600 })
    );

    // Assert response returns the capped amount
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 600, success: true })
    );
  });

  test('should not cap payment amount if amount is within pending dues', async () => {
    // Mock pending dues to be 1500 (greater than payment amount of 1000)
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1500);
    db.query.mockResolvedValue({ rows: [{ name: 'Farmer Tejas', phone: '9010090100', coldStorageId: 'cs_onboarding_123' }] });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    // Assert that the Razorpay order was created with original amount * 100 in paise (1000 * 100 = 100000)
    expect(razorpayService.createOrder).toHaveBeenCalledWith(100000, expect.any(String));

    // Assert createPendingPayment was called with original amount
    expect(paymentRepository.createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000 })
    );

    // Assert response returns original amount
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000, success: true })
    );
  });
});
