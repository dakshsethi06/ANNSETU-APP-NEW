const express = require('express');
const router = express.Router();

const onlineController = require('./payment.online.controller');
const manualController = require('./payment.manual.controller');
const viewsController = require('./payment.views.controller');

// Online payments (Razorpay)
router.post('/payments/order', onlineController.createOrder);
router.post('/payments/verify', onlineController.verifyPayment);
router.post('/payments/webhook', onlineController.handleWebhook);

// Offline / Manual payments
router.post('/payments/initiated', manualController.initiatePayment);
router.get('/payments/:id', manualController.getPaymentDetails);
router.post('/payments/:id/approve', manualController.approvePayment);
router.post('/payments/:id/reject', manualController.rejectPayment);

// Payment Views (HTML templates)
router.get('/payments/mock-checkout/:orderId', viewsController.renderMockCheckout);
router.get('/payments/success', viewsController.renderSuccessPage);

module.exports = router;
