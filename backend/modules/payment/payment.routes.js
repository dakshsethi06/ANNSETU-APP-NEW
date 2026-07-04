const express = require('express');
const router = express.Router();

const createOrder = require('./payment.create.controller');
const verifyPayment = require('./payment.verify.controller');
const handleWebhook = require('./payment.webhook.controller');
const manualController = require('./payment.manual.controller');
const viewsController = require('./payment.views.controller');

// Online payments (Razorpay)
router.post('/payments/order', createOrder);
router.post('/payments/verify', verifyPayment);
router.post('/payments/webhook', handleWebhook);

// Offline / Manual payments
router.post('/payments/initiated', manualController.initiatePayment);
router.get('/payments/:id', manualController.getPaymentDetails);
router.post('/payments/:id/approve', manualController.approvePayment);
router.post('/payments/:id/reject', manualController.rejectPayment);

// Payment Views (HTML templates)
router.get('/payments/mock-checkout/:orderId', viewsController.renderMockCheckout);
router.get('/payments/success', viewsController.renderSuccessPage);

module.exports = router;
