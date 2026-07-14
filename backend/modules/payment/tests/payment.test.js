const db = require('../../../config/database');
const paymentRepository = require('../payment.repository');
const razorpayService = require('../razorpay.service');
const createOrder = require('../payment.create.controller');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

jest.mock('../payment.repository', () => ({
  getFarmerPendingRent: jest.fn(),
  createPendingPayment: jest.fn()
}));

jest.mock('../razorpay.service', () => ({
  isMockMode: jest.fn(),
  createOrder: jest.fn(),
  createPaymentLink: jest.fn(),
  keyId: 'rzp_test_mockkey'
}));

const farmerRepository = require('../../farmer/farmer.repository');
jest.mock('../../farmer/farmer.repository');

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
    paymentRepository.getFarmerPendingRent.mockResolvedValue(600);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Tejas', phone: '9010090100', coldStorageId: 'cs_onboarding_123' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    expect(razorpayService.createOrder).toHaveBeenCalledWith(60000, expect.any(String));
    expect(paymentRepository.createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 600 })
    );
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 600, success: true })
    );
  });

  test('should not cap payment amount if amount is within pending dues', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1500);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Tejas', phone: '9010090100', coldStorageId: 'cs_onboarding_123' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    expect(razorpayService.createOrder).toHaveBeenCalledWith(100000, expect.any(String));
    expect(paymentRepository.createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000 })
    );
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000, success: true })
    );
  });

  test('should log warning if farmer profile fetch throws error', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1500);
    farmerRepository.getFarmerBasicDetails.mockRejectedValueOnce(new Error('Profile fetch failed'));
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await createOrder(mockReq, mockRes);

    expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch farmer profile'), 'Profile fetch failed');
    expect(mockRes.status).toHaveBeenCalledWith(400);
    spyWarn.mockRestore();
  });

  test('should return 400 if coldStorageId is missing', async () => {
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer', coldStorageId: null });

    await createOrder(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'coldStorageId is required.' }));
  });

  test('should fallback to pending rent if amount is missing or falsy', async () => {
    mockReq.body.amount = null;
    paymentRepository.getFarmerPendingRent.mockResolvedValue(800);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    expect(paymentRepository.createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 800 })
    );
  });

  test('should return 400 if finalAmount <= 0', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(0);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer', coldStorageId: 'CS1' });

    await createOrder(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'No pending rent balance to pay.' }));
  });

  test('real mode: should create payment link successfully with host routing', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Ram', phone: '9876543210', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(false);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_123' });
    razorpayService.createPaymentLink.mockResolvedValue({ short_url: 'https://rzp.io/l/xyz' });

    await createOrder(mockReq, mockRes);

    expect(razorpayService.createPaymentLink).toHaveBeenCalledWith(expect.objectContaining({
      amountPaise: 100000,
      orderId: 'order_123',
      callbackUrl: 'http://localhost:3001/api/payments/success'
    }));
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      payment_link_url: 'https://rzp.io/l/xyz'
    }));
  });

  test('real mode: fallback to mock checkout url if link creation throws or is empty', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Ram', phone: '9876543210', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(false);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_123' });
    razorpayService.createPaymentLink.mockRejectedValueOnce(new Error('Link generation error'));
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await createOrder(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      payment_link_url: 'http://localhost:3001/api/payments/mock-checkout/order_123'
    }));
    spyWarn.mockRestore();
  });

  test('should return 500 if database save fails', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Ram', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });
    paymentRepository.createPendingPayment.mockRejectedValueOnce(new Error('Save failed'));
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await createOrder(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Save failed' }));
    spyError.mockRestore();
  });
});
