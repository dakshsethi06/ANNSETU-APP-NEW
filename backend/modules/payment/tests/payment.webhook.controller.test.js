const paymentRepository = require('../payment.repository');
const razorpayService = require('../razorpay.service');
const handleWebhook = require('../payment.webhook.controller');

jest.mock('../payment.repository');
jest.mock('../razorpay.service');
jest.mock('../../../shared/notifications/pushNotifications', () => ({
  sendPushNotification: jest.fn()
}));

const pushNotifications = require('../../../shared/notifications/pushNotifications');

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
    paymentRepository.getPaymentById.mockResolvedValueOnce({ farmerId: 'farmer123', amount: 100 });

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'PAID', 'pay1');
    expect(pushNotifications.sendPushNotification).toHaveBeenCalledWith(
      'farmer123',
      'Payment Successful',
      'Your payment of Rs. 100 has been successfully processed.'
    );
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
    paymentRepository.getPaymentById.mockResolvedValueOnce({ farmerId: 'farmer123', amount: 100 });

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'PAID', 'pay1');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('handles push notification error on payment capture gracefully', async () => {
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
    paymentRepository.getPaymentById.mockResolvedValueOnce({ farmerId: 'farmer123', amount: 100 });
    pushNotifications.sendPushNotification.mockRejectedValueOnce(new Error('Push fail'));
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await handleWebhook(req, res);

    expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to send success push notification'), 'Push fail');
    expect(res.json).toHaveBeenCalledWith({ received: true });
    spyWarn.mockRestore();
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
    paymentRepository.getPaymentById.mockResolvedValueOnce({ farmerId: 'farmer123', amount: 100 });

    await handleWebhook(req, res);

    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'CANCELLED');
    expect(pushNotifications.sendPushNotification).toHaveBeenCalledWith(
      'farmer123',
      'Payment Failed',
      'Your payment of Rs. 100 has failed.'
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('handles push notification error on payment failure gracefully', async () => {
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
    paymentRepository.getPaymentById.mockResolvedValueOnce({ farmerId: 'farmer123', amount: 100 });
    pushNotifications.sendPushNotification.mockRejectedValueOnce(new Error('Push fail failed'));
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await handleWebhook(req, res);

    expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to send failure push notification'), 'Push fail failed');
    expect(res.json).toHaveBeenCalledWith({ received: true });
    spyWarn.mockRestore();
  });

  test('processes payment.captured event but skips push notification if payment details not found or missing farmerId', async () => {
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
    paymentRepository.getPaymentById.mockResolvedValueOnce(null);

    await handleWebhook(req, res);

    expect(pushNotifications.sendPushNotification).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('processes payment.failed event but skips push notification if payment details not found or missing farmerId', async () => {
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
    paymentRepository.getPaymentById.mockResolvedValueOnce({ farmerId: null });

    await handleWebhook(req, res);

    expect(pushNotifications.sendPushNotification).not.toHaveBeenCalled();
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
