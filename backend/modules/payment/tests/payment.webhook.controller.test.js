const paymentRepository = require('../payment.repository');
const razorpayService = require('../razorpay.service');
const handleWebhook = require('../payment.webhook.controller');

jest.mock('../payment.repository');
jest.mock('../razorpay.service');

describe('payment.webhook.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('returns 401 if webhook signature is invalid', async () => {
    req = {
      headers: { 'x-razorpay-signature': 'sig1' },
      body: { event: 'payment.captured' }
    };
    razorpayService.verifyWebhookSignature.mockReturnValueOnce(false);

    await handleWebhook(req, res);

    expect(razorpayService.verifyWebhookSignature).toHaveBeenCalledWith(JSON.stringify(req.body), 'sig1');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid webhook signature.' });
  });

  test('processes payment.captured event and updates status to PAID', async () => {
    req = {
      headers: { 'x-razorpay-signature': 'sig1' },
      body: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: { order_id: 'ord1', id: 'pay1' }
          }
        }
      }
    };
    razorpayService.verifyWebhookSignature.mockReturnValueOnce(true);

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'PAID', 'pay1');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('processes order.paid event and updates status to PAID', async () => {
    req = {
      headers: { 'x-razorpay-signature': 'sig1' },
      body: {
        event: 'order.paid',
        payload: {
          payment: {
            entity: { order_id: 'ord1', id: 'pay1' }
          }
        }
      }
    };
    razorpayService.verifyWebhookSignature.mockReturnValueOnce(true);

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'PAID', 'pay1');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('processes payment.failed event and updates status to CANCELLED', async () => {
    req = {
      headers: { 'x-razorpay-signature': 'sig1' },
      body: {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: { order_id: 'ord1' }
          }
        }
      }
    };
    razorpayService.verifyWebhookSignature.mockReturnValueOnce(true);

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'CANCELLED');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('ignores other events and returns received: true without database updates', async () => {
    req = {
      headers: { 'x-razorpay-signature': 'sig1' },
      body: { event: 'payment.authorized' }
    };
    razorpayService.verifyWebhookSignature.mockReturnValueOnce(true);

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('processes payment.captured event but skips update if order_id is missing', async () => {
    req = {
      headers: { 'x-razorpay-signature': 'sig1' },
      body: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: { id: 'pay1' } // no order_id
          }
        }
      }
    };
    razorpayService.verifyWebhookSignature.mockReturnValueOnce(true);

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('processes payment.failed event but skips update if order_id is missing', async () => {
    req = {
      headers: { 'x-razorpay-signature': 'sig1' },
      body: {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {} // no order_id
          }
        }
      }
    };
    razorpayService.verifyWebhookSignature.mockReturnValueOnce(true);

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('returns 500 on database or runtime error during webhook execution', async () => {
    req = {
      headers: { 'x-razorpay-signature': 'sig1' },
      body: { event: 'payment.captured' }
    };
    razorpayService.verifyWebhookSignature.mockImplementationOnce(() => {
      throw new Error('Runtime error');
    });

    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Runtime error' });
    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });
});
