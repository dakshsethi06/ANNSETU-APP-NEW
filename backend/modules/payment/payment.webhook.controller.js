const paymentRepository = require('./payment.repository');
const razorpayService = require('./razorpay.service');
const { sendPushNotification } = require('../../shared/notifications/pushNotifications');

async function handleWebhook(req, res) {
  const signatureHeader = req.headers['x-razorpay-signature'];

  try {
    const bodyString = JSON.stringify(req.body);
    const isValid = razorpayService.verifyWebhookSignature(bodyString, signatureHeader);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const entity = req.body.payload.payment.entity;
      const orderId = entity.order_id;
      const paymentId = entity.id;

      if (orderId) {
        await paymentRepository.updatePaymentStatus(orderId, 'PAID', paymentId);
        try {
          const payment = await paymentRepository.getPaymentById(orderId);
          if (payment && payment.farmerId) {
            await sendPushNotification(
              payment.farmerId,
              'Payment Successful',
              `Your payment of Rs. ${payment.amount} has been successfully processed.`
            );
          }
        } catch (pushErr) {
          console.warn('Failed to send success push notification:', pushErr.message);
        }
      }
    } else if (event === 'payment.failed') {
      const entity = req.body.payload.payment.entity;
      const orderId = entity.order_id;

      if (orderId) {
        await paymentRepository.updatePaymentStatus(orderId, 'CANCELLED');
        try {
          const payment = await paymentRepository.getPaymentById(orderId);
          if (payment && payment.farmerId) {
            await sendPushNotification(
              payment.farmerId,
              'Payment Failed',
              `Your payment of Rs. ${payment.amount} has failed.`
            );
          }
        } catch (pushErr) {
          console.warn('Failed to send failure push notification:', pushErr.message);
        }
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = handleWebhook;
