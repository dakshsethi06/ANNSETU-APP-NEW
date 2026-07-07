const express = require('express');
const router = express.Router();
const farmerController = require('./farmer.controller');
const { validateRegisterFarmer, validateLoginMpin, validateResetMpin } = require('./farmer.validator');

// Farmers endpoints
router.get('/farmers', farmerController.getFarmers);
router.post('/farmers', validateRegisterFarmer, farmerController.registerFarmer);
router.get('/farmers/:id/ledger', farmerController.getLedger);
router.get('/farmers/:id/statement/download', farmerController.downloadStatement);
router.get('/farmers/:id/statement/download-pdf', farmerController.downloadStatementPdf);
router.get('/farmers/:id/statement/download-receipt-pdf', farmerController.downloadReceiptPdf);
router.post('/farmers/login-mpin', validateLoginMpin, farmerController.loginMpin);
router.post('/farmers/reset-mpin', validateResetMpin, farmerController.resetMpin);
router.put('/farmers/:id', farmerController.updateFarmer);
router.post('/otp/send-verification', farmerController.sendProfileOtp);
router.post('/otp/verify-and-update', farmerController.verifyAndUpdateProfile);

module.exports = router;
