const express = require('express');
const router = express.Router();
const controller = require('./kyc.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');

// Public routes for DigiLocker web interface & callbacks
router.get('/kyc/digilocker/mock-consent', controller.serveMockConsentPage);
router.get('/kyc/digilocker/mock-consent/approve', controller.approveMockConsent);
router.get('/kyc/digilocker/callback', controller.serveCallbackPage);

// Authenticated endpoints called by the mobile app
router.post('/kyc/digilocker/initiate', authMiddleware, controller.initiateDigiLocker);
router.get('/kyc/digilocker/status/:verification_id', authMiddleware, controller.checkDigiLockerStatus);
router.post('/kyc/bank/verify-sync', authMiddleware, controller.verifyBankAccountSync);

module.exports = router;
