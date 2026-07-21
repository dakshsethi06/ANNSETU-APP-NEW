const paymentRepository = require('./payment.repository');
const razorpayService = require('./razorpay.service');

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
      }
    } else if (event === 'payment.failed') {
      const entity = req.body.payload.payment.entity;
      const orderId = entity.order_id;

      if (orderId) {
        await paymentRepository.updatePaymentStatus(orderId, 'CANCELLED');
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = handleWebhook;
