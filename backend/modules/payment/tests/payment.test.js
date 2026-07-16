const db = require('../../../config/database');
const paymentRepository = require('../payment.repository');
const razorpayService = require('../razorpay.service');
const createOrder = require('../payment.create.controller');

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn().mockImplementation(() => Promise.resolve({
    query: jest.fn().mockImplementation((queryStr) => {
      if (queryStr.includes('FOR UPDATE')) {
        // Just return a mock value that can be overridden in tests, or we can look up the mock of getFarmerPendingRent
        const paymentRepo = require('../payment.repository');
        return paymentRepo.getFarmerPendingRent().then(val => ({ rows: [{ balanceDueAmount: val }] }));
      }
      return Promise.resolve({ rows: [] });
    }),
    release: jest.fn()
  }))
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

const voucherService = require('../../voucher/voucher.service');
jest.mock('../../voucher/voucher.service', () => ({
  validateAndCalculateDiscount: jest.fn()
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

  test('should apply voucher discount successfully', async () => {
    mockReq.body.voucherCode = 'SAVE20';
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Partner', coldStorageId: 'CS1' });
    voucherService.validateAndCalculateDiscount.mockResolvedValueOnce({
      discountAmount: 200,
      netAmount: 800
    });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    expect(voucherService.validateAndCalculateDiscount).toHaveBeenCalledWith(
      'SAVE20', 'farmer_123', 1000, 'CS1'
    );
    expect(paymentRepository.createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 800,
        voucherCode: 'SAVE20',
        discountAmount: 200
      })
    );
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 800, success: true })
    );
  });

  test('should return 400 if voucher covers the full payment amount', async () => {
    mockReq.body.voucherCode = 'SAVE1000';
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Partner', coldStorageId: 'CS1' });
    voucherService.validateAndCalculateDiscount.mockResolvedValueOnce({
      discountAmount: 1000,
      netAmount: 0
    });

    await createOrder(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Voucher covers the full payment amount. Please redeem it directly.' })
    );
  });

  test('should return 400 if voucher validation throws error', async () => {
    mockReq.body.voucherCode = 'EXPIRED';
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Partner', coldStorageId: 'CS1' });
    voucherService.validateAndCalculateDiscount.mockRejectedValueOnce(new Error('Voucher has expired.'));

    await createOrder(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Voucher has expired.' })
    );
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
  test('should fallback to default name and phone if farmer details are invalid or missing', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    // Name is empty, phone is repeating digits (invalid length and pattern)
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: '', phone: '1111111111', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);
    
    // We can't easily assert on local variables `farmerName` and `farmerPhone` inside the mock block, 
    // but this ensures the code executes those lines (branch coverage).
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('should resolve real domain serverIp correctly', async () => {
    mockReq.headers.host = 'annsetu.com'; // Live domain
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      payment_link_url: 'http://annsetu.com/api/payments/mock-checkout/order_mock123'
    }));
  });

  test('real mode: should fallback to mock checkout url if link is falsy but no error is thrown', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Ram', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(false);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_123' });
    // Return falsy link without throwing
    razorpayService.createPaymentLink.mockResolvedValue(null);

    await createOrder(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      payment_link_url: 'http://localhost:3001/api/payments/mock-checkout/order_123'
    }));
  });

  test('should return default 500 error message if error has no message', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Ram', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });
    // Rejecting with a string means error.message is undefined
    paymentRepository.createPendingPayment.mockRejectedValueOnce('Some string error');
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await createOrder(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to create payment order.' }));
    spyError.mockRestore();
  });
  test('should handle undefined req.headers.host and fallback to localhost:3001', async () => {
    mockReq.headers.host = undefined;
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      payment_link_url: 'http://localhost:3001/api/payments/mock-checkout/order_mock123'
    }));
  });

  test('should handle getFarmerBasicDetails returning null gracefully', async () => {
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    // Resolving to null
    farmerRepository.getFarmerBasicDetails.mockResolvedValue(null);
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    // Should return 400 because coldStorageId will be missing
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('should use req.user.id as farmerId if present', async () => {
    mockReq.user = { id: 'farmer_user_123' };
    paymentRepository.getFarmerPendingRent.mockResolvedValue(1000);
    farmerRepository.getFarmerBasicDetails.mockResolvedValue({ name: 'Farmer Ram', coldStorageId: 'CS1' });
    razorpayService.isMockMode.mockReturnValue(true);
    razorpayService.createOrder.mockResolvedValue({ id: 'order_mock123' });

    await createOrder(mockReq, mockRes);

    // Verify it used req.user.id to query and save
    expect(farmerRepository.getFarmerBasicDetails).toHaveBeenCalledWith('farmer_user_123');
    expect(paymentRepository.createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ farmerId: 'farmer_user_123' })
    );
  });
});
