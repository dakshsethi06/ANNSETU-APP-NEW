const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../../config/database');
const paymentRepository = require('./payment.repository');
const { createAppNotification } = require('../../shared/notifications/notifications');
const manualController = require('./payment.manual.controller');

// Fetch credentials from env, with fallbacks for local test/mock runs
const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_DakshSethi123';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_daksh_sethi';

let razorpayInstance = null;
try {
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
} catch (e) {
  console.warn('Razorpay client initialization warning:', e.message);
}

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

    let orderId;
    let paymentLinkUrl;
    let serverIp = req.headers.host || '10.36.66.6:3001';
    if (serverIp.includes('localhost') || serverIp.includes('127.0.0.1')) {
      serverIp = '10.36.66.6:3001';
    }
    const isMockMode = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'mock_secret_daksh_sethi';

    if (isMockMode) {
      orderId = `order_mock_${Math.random().toString(36).substr(2, 9)}`;
      paymentLinkUrl = `http://${serverIp}/api/payments/mock-checkout/${orderId}`;
    } else {
      const order = await razorpayInstance.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: receipt,
      });
      orderId = order.id;

      try {
        const callbackUrl = `http://${serverIp}/api/payments/success`;

        const link = await razorpayInstance.paymentLink.create({
          amount: amountPaise,
          currency: 'INR',
          accept_partial: false,
          description: `Rent payment for Farmer account ${farmerId}`,
          customer: {
            name: 'Farmer Partner',
            email: `farmer_${farmerId}@annsetu.local`,
            contact: farmerId.length === 10 ? farmerId : '9999999999'
          },
          notify: { sms: false, email: false },
          reminder_enable: false,
          notes: { order_id: orderId },
          callback_url: callbackUrl,
          callback_method: 'get',
          reference_id: orderId
        });
        paymentLinkUrl = link.short_url;
      } catch (linkErr) {
        console.warn('Razorpay payment link creation failed:', linkErr.message);
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
      key_id: keyId,
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
    let isValid = false;
    const isMock = razorpay_order_id.startsWith('order_mock_') || razorpay_signature === 'mock_signature';

    if (isMock) {
      isValid = true;
    } else {
      if (!razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Missing razorpay_signature.' });
      }
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');
      isValid = generatedSignature === razorpay_signature;
    }

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
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_daksh_sethi';

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const skipVerify = webhookSecret === 'webhook_secret_daksh_sethi';
    if (!skipVerify && expectedSignature !== signatureHeader) {
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
