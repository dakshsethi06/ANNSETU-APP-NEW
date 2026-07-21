const verifyPayment = require('../payment.verify.controller');
const razorpayService = require('../razorpay.service');
const paymentRepository = require('../payment.repository');
const { createAppNotification } = require('../../../shared/notifications/notifications');

jest.mock('../razorpay.service');
jest.mock('../payment.repository');
jest.mock('../../../shared/notifications/notifications');

describe('payment.verify.controller unit tests', () => {
  let req, res, spyStatus, spyJson;

  beforeEach(() => {
    jest.clearAllMocks();
    spyStatus = jest.fn().mockReturnThis();
    spyJson = jest.fn();
    res = {
      status: spyStatus,
      json: spyJson
    };
  });

  test('returns 400 if required parameters are missing', async () => {
    req = {
      body: {
        razorpay_order_id: 'ord1'
        // missing payment_id
      }
    };

    await verifyPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Missing required verification parameters.'
    });
  });

  test('delegates manual offline cases to the manual controller if utrNumber and paymentId are present', async () => {
    req = {
      body: {
        paymentId: 'PAY123',
        utrNumber: 'UTR123456789012'
      }
    };
    const manualController = require('../payment.manual.controller');
    jest.spyOn(manualController, 'verifyManualPayment').mockResolvedValueOnce();

    await verifyPayment(req, res);

    expect(manualController.verifyManualPayment).toHaveBeenCalledWith(req, res);
  });

  test('returns 400 if signature verification fails and cancels payment', async () => {
    req = {
      body: {
        razorpay_order_id: 'ord1',
        razorpay_payment_id: 'pay1',
        razorpay_signature: 'sig1'
      }
    };
    razorpayService.verifySignature.mockReturnValueOnce(false);

    await verifyPayment(req, res);

    expect(razorpayService.verifySignature).toHaveBeenCalledWith('ord1', 'pay1', 'sig1');
    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'CANCELLED');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Payment signature verification failed.'
    });
  });

  test('updates status and sends notification on successful verification', async () => {
    req = {
      body: {
        razorpay_order_id: 'ord1',
        razorpay_payment_id: 'pay1',
        razorpay_signature: 'sig1'
      }
    };
    razorpayService.verifySignature.mockReturnValueOnce(true);
    paymentRepository.getPaymentById.mockResolvedValueOnce({
      amount: 500,
      farmerId: 'farmer1',
      coldStorageId: 'cs1'
    });

    await verifyPayment(req, res);

    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'PAID', 'pay1');
    expect(createAppNotification).toHaveBeenCalledWith({
      coldStorageId: 'cs1',
      userId: 'farmer1',
      type: 'billing',
      title: 'Payment Successful',
      message: 'Your payment of ₹500 has been successfully processed. Thank you!',
      icon: 'dollar-sign'
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Payment verified and captured.'
    });
  });

  test('verifies signature but skips notification if payment record not found', async () => {
    req = {
      body: {
        razorpay_order_id: 'ord1',
        razorpay_payment_id: 'pay1',
        razorpay_signature: 'sig1'
      }
    };
    razorpayService.verifySignature.mockReturnValueOnce(true);
    paymentRepository.getPaymentById.mockResolvedValueOnce(null);

    await verifyPayment(req, res);

    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'PAID', 'pay1');
    expect(createAppNotification).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Payment verified and captured.'
    });
  });

  test('gracefully handles app notification throwing error without message', async () => {
    req = {
      body: {
        razorpay_order_id: 'ord1',
        razorpay_payment_id: 'pay1',
        razorpay_signature: 'sig1'
      }
    };
    razorpayService.verifySignature.mockReturnValueOnce(true);
    paymentRepository.getPaymentById.mockResolvedValueOnce({
      amount: 500,
      farmerId: 'farmer1',
      coldStorageId: 'cs1'
    });
    createAppNotification.mockRejectedValueOnce({});
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await verifyPayment(req, res);

    expect(spyWarn).toHaveBeenCalledWith(expect.any(String), undefined);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Payment verified and captured.'
    });
    spyWarn.mockRestore();
  });

  test('returns 500 when verification exceptions occur with message', async () => {
    req = {
      body: {
        razorpay_order_id: 'ord1',
        razorpay_payment_id: 'pay1',
        razorpay_signature: 'sig1'
      }
    };
    razorpayService.verifySignature.mockImplementationOnce(() => {
      throw new Error('Verification exception');
    });

    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await verifyPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Verification exception' });
    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });

  test('returns 500 when verification exceptions occur without message', async () => {
    req = {
      body: {
        razorpay_order_id: 'ord1',
        razorpay_payment_id: 'pay1',
        razorpay_signature: 'sig1'
      }
    };
    razorpayService.verifySignature.mockImplementationOnce(() => {
      throw {};
    });

    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await verifyPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to verify payment.' });
    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });
});
