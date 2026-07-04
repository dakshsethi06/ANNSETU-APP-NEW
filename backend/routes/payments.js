const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/payments/order', paymentController.createOrder);
router.post('/payments/initiated', paymentController.initiatePayment);
router.post('/payments/verify', paymentController.verifyPayment);
router.post('/payments/webhook', paymentController.handleWebhook);
router.get('/payments/mock-checkout/:orderId', paymentController.renderMockCheckout);
router.get('/payments/success', paymentController.renderSuccessPage);

router.get('/payments/:id', paymentController.getPaymentDetails);
router.post('/payments/:id/approve', paymentController.approvePayment);
router.post('/payments/:id/reject', paymentController.rejectPayment);

module.exports = router;
