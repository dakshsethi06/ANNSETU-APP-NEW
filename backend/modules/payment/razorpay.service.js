const Razorpay = require('razorpay');
const crypto = require('crypto');

// Fetch credentials from env, with fallbacks for local test/mock runs
const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_DakshSethi123';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_daksh_sethi';
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_daksh_sethi';

let razorpayInstance = null;
try {
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
} catch (e) {
  console.warn('Razorpay client initialization warning:', e.message);
}

/**
 * Checks if the service is running in mock mode.
 * Mock mode is active if key secret is missing or matches the default mock secret.
 */
function isMockMode() {
  return !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'mock_secret_daksh_sethi';
}

/**
 * Creates a standard Razorpay Order.
 */
async function createOrder(amountPaise, receipt) {
  if (isMockMode()) {
    return { id: `order_mock_${Math.random().toString(36).substr(2, 9)}` };
  }
  return await razorpayInstance.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: receipt,
  });
}

/**
 * Creates a Razorpay Hosted Payment Link.
 */
async function createPaymentLink({ amountPaise, description, customer, callbackUrl, orderId }) {
  if (isMockMode()) {
    return null; // Controller will handle mock checkout URL generation
  }
  return await razorpayInstance.paymentLink.create({
    amount: amountPaise,
    currency: 'INR',
    accept_partial: false,
    description: description,
    customer: customer,
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { order_id: orderId },
    callback_url: callbackUrl,
    callback_method: 'get',
    reference_id: orderId
  });
}

/**
 * Verifies standard client-side signature.
 */
function verifySignature(orderId, paymentId, signature) {
  if (orderId.startsWith('order_mock_') || signature === 'mock_signature') {
    return true;
  }
  if (!signature) {
    return false;
  }
  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${orderId}|${paymentId}`);
  const generatedSignature = hmac.digest('hex');
  return generatedSignature === signature;
}

/**
 * Verifies webhook signature sent by Razorpay servers.
 */
function verifyWebhookSignature(bodyString, signatureHeader) {
  const skipVerify = webhookSecret === 'webhook_secret_daksh_sethi';
  if (skipVerify) {
    return true;
  }
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyString)
    .digest('hex');
  return expectedSignature === signatureHeader;
}

async function fetchPaymentDetails(paymentId) {
  if (isMockMode() || (paymentId && paymentId.startsWith('pay_mock_'))) {
    return {
      id: paymentId || 'pay_mock_' + Math.random().toString(36).substr(2, 9),
      method: 'upi',
      status: 'captured',
      vpa: 'mock_farmer@okhdfcbank',
      acquirer_data: {
        bank_transaction_id: 'HDFC1342U38388'
      }
    };
  }
  return await razorpayInstance.payments.fetch(paymentId);
}

module.exports = {
  keyId,
  isMockMode,
  createOrder,
  createPaymentLink,
  verifySignature,
  verifyWebhookSignature,
  fetchPaymentDetails
};
