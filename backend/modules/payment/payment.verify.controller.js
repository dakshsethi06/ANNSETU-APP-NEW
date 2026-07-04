const paymentRepository = require('./payment.repository');
const { createAppNotification } = require('../../shared/notifications/notifications');
const manualController = require('./payment.manual.controller');
const razorpayService = require('./razorpay.service');

async function verifyPayment(req, res) {
  console.log('[Payment Verify API] Incoming req.body:', req.body);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId, utrNumber } = req.body;

  // Delegate manual offline cases to the manual controller
  if (utrNumber && paymentId) {
    return manualController.verifyManualPayment(req, res);
  }

  if (!razorpay_order_id || !razorpay_payment_id) {
    console.log('[Payment Verify API] Missing parameters:', { razorpay_order_id, razorpay_payment_id });
    return res.status(400).json({ success: false, error: 'Missing required verification parameters.' });
  }

  try {
    const isValid = razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      console.log('[Payment Verify API] Signature verification failed for order:', razorpay_order_id);
      await paymentRepository.updatePaymentStatus(razorpay_order_id, 'CANCELLED');
      return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
    }

    console.log('[Payment Verify API] Updating payment to PAID for order:', razorpay_order_id);
    await paymentRepository.updatePaymentStatus(razorpay_order_id, 'PAID', razorpay_payment_id);

    try {
      const payment = await paymentRepository.getPaymentById(razorpay_order_id);
      if (payment) {
        await createAppNotification({
          coldStorageId: payment.coldStorageId,
          userId: payment.farmerId,
          type: 'billing',
          title: 'Payment Successful',
          message: `Your payment of ₹${payment.amount} has been successfully processed. Thank you!`,
          icon: 'dollar-sign'
        });
      }
    } catch (err) {
      console.warn('Failed to send payment confirmation notification:', err.message);
    }

    return res.json({ success: true, message: 'Payment verified and captured.' });
  } catch (error) {
    console.error('Razorpay verifyPayment error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to verify payment.' });
  }
}

module.exports = verifyPayment;
