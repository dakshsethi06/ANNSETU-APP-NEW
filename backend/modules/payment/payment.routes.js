const express = require('express');
const router = express.Router();

const createOrder = require('./payment.create.controller');
const verifyPayment = require('./payment.verify.controller');
const handleWebhook = require('./payment.webhook.controller');
const manualController = require('./payment.manual.controller');
const approveController = require('./payment.approve.controller');
const rejectController = require('./payment.reject.controller');
const viewsController = require('./payment.views.controller');
const { validateCreateOrder, validateInitiatePayment, validateGetPaymentDetails } = require('./payment.validator');

// Online payments (Razorpay)
router.post('/payments/order', validateCreateOrder, createOrder);
router.post('/payments/verify', verifyPayment);
router.post('/payments/webhook', handleWebhook);

// Offline / Manual payments
router.post('/payments/initiated', validateInitiatePayment, manualController.initiatePayment);
router.get('/payments/:id', validateGetPaymentDetails, approveController.getPaymentDetails);
router.post('/payments/:id/approve', approveController.approvePayment);
router.post('/payments/:id/reject', rejectController.rejectPayment);

// Payment Views (HTML templates)
router.get('/payments/mock-checkout/:orderId', viewsController.renderMockCheckout);
router.get('/payments/success', viewsController.renderSuccessPage);

module.exports = router;
