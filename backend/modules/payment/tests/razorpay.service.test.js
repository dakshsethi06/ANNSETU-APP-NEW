// razorpay.service.js reads env at require-time, so each describe
// sets env FIRST, then requires a fresh copy via jest.resetModules().

const crypto = require('crypto');

// The npm 'razorpay' package is mocked so no real client is created
const mockOrdersCreate = jest.fn();
const mockPaymentLinkCreate = jest.fn();
const mockPaymentsFetch = jest.fn();
let mockConstructor = jest.fn();

jest.mock('razorpay', () =>
  jest.fn().mockImplementation((...args) => {
    mockConstructor(...args);
    return {
      orders: { create: mockOrdersCreate },
      paymentLink: { create: mockPaymentLinkCreate },
      payments: { fetch: mockPaymentsFetch },
    };
  })
);

const loadService = (env = {}) => {
  jest.resetModules();
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  Object.assign(process.env, env);
  return require('../razorpay.service');
};

describe('razorpay.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logs warn if Razorpay key validation check throws error during loadService', () => {
    mockConstructor.mockImplementationOnce(() => {
      throw new Error('Constructor Init Failed');
    });
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Bypass Jest's cached module load
    delete require.cache[require.resolve('../razorpay.service')];
    
    const svc = loadService({ RAZORPAY_KEY_ID: 'k', RAZORPAY_KEY_SECRET: 's' });
    expect(svc).toBeDefined();
    expect(spyWarn).toHaveBeenCalledWith(
      expect.stringContaining('Razorpay client initialization warning:'),
      expect.any(String)
    );
    spyWarn.mockRestore();
  });

  describe('isMockMode', () => {
    test('true when RAZORPAY_KEY_SECRET is not set', () => {
      const svc = loadService({});
      expect(svc.isMockMode()).toBe(true);
    });

    test('true when secret equals the default mock secret', () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'mock_secret_daksh_sethi' });
      expect(svc.isMockMode()).toBe(true);
    });

    test('false when a real secret is set', () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret_abc' });
      expect(svc.isMockMode()).toBe(false);
    });
  });

  describe('createOrder', () => {
    test('mock mode: returns generated order_mock_ id without calling Razorpay', async () => {
      const svc = loadService({});
      const order = await svc.createOrder(50000, 'rcpt_1');
      expect(order.id).toMatch(/^order_mock_/);
      expect(mockOrdersCreate).not.toHaveBeenCalled();
    });

    test('real mode: calls Razorpay orders.create with INR amount', async () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      mockOrdersCreate.mockResolvedValue({ id: 'order_real_1' });
      const order = await svc.createOrder(50000, 'rcpt_1');
      expect(order.id).toBe('order_real_1');
      expect(mockOrdersCreate).toHaveBeenCalledWith({
        amount: 50000,
        currency: 'INR',
        receipt: 'rcpt_1',
      });
    });
  });

  describe('createPaymentLink', () => {
    test('mock mode: returns null (controller builds mock checkout URL)', async () => {
      const svc = loadService({});
      expect(await svc.createPaymentLink({ amountPaise: 1000 })).toBeNull();
      expect(mockPaymentLinkCreate).not.toHaveBeenCalled();
    });

    test('real mode: creates a payment link with order reference', async () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      mockPaymentLinkCreate.mockResolvedValue({ short_url: 'https://rzp.io/x' });
      const link = await svc.createPaymentLink({
        amountPaise: 1000,
        description: 'Rent payment',
        customer: { name: 'Ram' },
        callbackUrl: 'https://app/cb',
        orderId: 'order_1',
      });
      expect(link.short_url).toBe('https://rzp.io/x');
      expect(mockPaymentLinkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
          reference_id: 'order_1',
          callback_url: 'https://app/cb',
        })
      );
    });
  });

  describe('verifySignature', () => {
    test('accepts a correctly computed HMAC signature', () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      const valid = crypto
        .createHmac('sha256', 'real_secret')
        .update('order_1|pay_1')
        .digest('hex');
      expect(svc.verifySignature('order_1', 'pay_1', valid)).toBe(true);
    });

    test('rejects a wrong signature', () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      expect(svc.verifySignature('order_1', 'pay_1', 'deadbeef')).toBe(false);
    });

    test('rejects a missing signature', () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      expect(svc.verifySignature('order_1', 'pay_1', undefined)).toBe(false);
    });

    test('accepts mock order ids without verification', () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      expect(svc.verifySignature('order_mock_abc', 'pay_1', 'anything')).toBe(true);
    });

    test('SECURITY: literal "mock_signature" bypasses verification EVEN IN REAL MODE', () => {
      // Documents current behavior: signature === 'mock_signature' short-circuits
      // to true regardless of environment. In production this lets anyone
      // confirm a payment without paying. See audit notes — fix by gating
      // this bypass on isMockMode().
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_production_secret' });
      expect(svc.verifySignature('order_real_1', 'pay_real_1', 'mock_signature')).toBe(true);
    });
  });

  describe('verifyWebhookSignature', () => {
    test('returns false when webhook secret is not configured', () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      expect(svc.verifyWebhookSignature('{}', 'sig')).toBe(false);
    });

    test('returns false when secret is the default placeholder', () => {
      const svc = loadService({
        RAZORPAY_KEY_SECRET: 'real_secret',
        RAZORPAY_WEBHOOK_SECRET: 'webhook_secret_daksh_sethi',
      });
      expect(svc.verifyWebhookSignature('{}', 'sig')).toBe(false);
    });

    test('accepts a correctly signed webhook body', () => {
      const svc = loadService({
        RAZORPAY_KEY_SECRET: 'real_secret',
        RAZORPAY_WEBHOOK_SECRET: 'wh_secret',
      });
      const body = JSON.stringify({ event: 'payment.captured' });
      const sig = crypto.createHmac('sha256', 'wh_secret').update(body).digest('hex');
      expect(svc.verifyWebhookSignature(body, sig)).toBe(true);
    });

    test('rejects a tampered body', () => {
      const svc = loadService({
        RAZORPAY_KEY_SECRET: 'real_secret',
        RAZORPAY_WEBHOOK_SECRET: 'wh_secret',
      });
      const sig = crypto.createHmac('sha256', 'wh_secret').update('{"a":1}').digest('hex');
      expect(svc.verifyWebhookSignature('{"a":2}', sig)).toBe(false);
    });

    test('rejects missing signature header', () => {
      const svc = loadService({
        RAZORPAY_KEY_SECRET: 'real_secret',
        RAZORPAY_WEBHOOK_SECRET: 'wh_secret',
      });
      expect(svc.verifyWebhookSignature('{}', undefined)).toBe(false);
    });
  });

  describe('fetchPaymentDetails', () => {
    test('mock mode: returns fabricated captured UPI payment', async () => {
      const svc = loadService({});
      const details = await svc.fetchPaymentDetails('pay_x');
      expect(details.status).toBe('captured');
      expect(mockPaymentsFetch).not.toHaveBeenCalled();
    });

    test('mock mode: returns fabricated payment with random ID if paymentId is not provided', async () => {
      const svc = loadService({});
      const details = await svc.fetchPaymentDetails();
      expect(details.id).toMatch(/^pay_mock_/);
      expect(mockPaymentsFetch).not.toHaveBeenCalled();
    });

    test('real mode: pay_mock_ ids still return fabricated details', async () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      const details = await svc.fetchPaymentDetails('pay_mock_123');
      expect(details.id).toBe('pay_mock_123');
      expect(mockPaymentsFetch).not.toHaveBeenCalled();
    });

    test('real mode: fetches real payment from Razorpay', async () => {
      const svc = loadService({ RAZORPAY_KEY_SECRET: 'real_secret' });
      mockPaymentsFetch.mockResolvedValue({ id: 'pay_1', status: 'captured' });
      const details = await svc.fetchPaymentDetails('pay_1');
      expect(details).toEqual({ id: 'pay_1', status: 'captured' });
      expect(mockPaymentsFetch).toHaveBeenCalledWith('pay_1');
    });
  });
});