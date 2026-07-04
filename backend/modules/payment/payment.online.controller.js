const db = require('../../config/database');
const paymentRepository = require('./payment.repository');
const { createAppNotification } = require('../../shared/notifications/notifications');
const manualController = require('./payment.manual.controller');
const razorpayService = require('./razorpay.service');

async function createOrder(req, res) {
  const { farmerId } = req.body;
  if (!farmerId) {
    return res.status(400).json({ success: false, error: 'farmerId is required.' });
  }

  try {
    const pendingRent = await paymentRepository.getFarmerPendingRent(farmerId);
    if (pendingRent <= 0) {
      return res.status(400).json({ success: false, error: 'No pending rent balance to pay.' });
    }

    const amountPaise = Math.round(pendingRent * 100);
    const receipt = `rcpt_${farmerId}_${Date.now().toString().slice(-6)}`;

    let serverIp = req.headers.host || '10.36.66.6:3001';
    if (serverIp.includes('localhost') || serverIp.includes('127.0.0.1')) {
      serverIp = '10.36.66.6:3001';
    }

    const isMock = razorpayService.isMockMode();
    let orderId;
    let paymentLinkUrl;

    if (isMock) {
      const order = await razorpayService.createOrder(amountPaise, receipt);
      orderId = order.id;
      paymentLinkUrl = `http://${serverIp}/api/payments/mock-checkout/${orderId}`;
    } else {
      try {
        const order = await razorpayService.createOrder(amountPaise, receipt);
        orderId = order.id;

        const callbackUrl = `http://${serverIp}/api/payments/success`;
        const link = await razorpayService.createPaymentLink({
          amountPaise: amountPaise,
          description: `Rent payment for Farmer account ${farmerId}`,
          customer: {
            name: 'Farmer Partner',
            email: `farmer_${farmerId}@annsetu.local`,
            contact: farmerId.length === 10 ? farmerId : '9999999999'
          },
          callbackUrl: callbackUrl,
          orderId: orderId
        });

        paymentLinkUrl = link ? link.short_url : `http://${serverIp}/api/payments/mock-checkout/${orderId}`;
      } catch (err) {
        console.warn('Real Razorpay order/link generation failed, falling back to mock:', err.message);
        // Fallback to mock order generation if Razorpay APIs fail or rate limit
        const mockOrder = await razorpayService.createOrder(amountPaise, receipt);
        orderId = mockOrder.id;
        paymentLinkUrl = `http://${serverIp}/api/payments/mock-checkout/${orderId}`;
      }
    }

    await paymentRepository.createPendingPayment({
      orderId: orderId,
      farmerId: farmerId,
      amount: pendingRent,
      note: `Online Rent Payment via App for account ${farmerId}`
    });

    return res.json({
      success: true,
      order_id: orderId,
      key_id: razorpayService.keyId,
      amount: pendingRent,
      currency: 'INR',
      payment_link_url: paymentLinkUrl
    });
  } catch (error) {
    console.error('Razorpay createOrder error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create payment order.' });
  }
}

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

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook
};
