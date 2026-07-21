const express = require('express');
const router = express.Router();
const amadController = require('./amad.controller');
const { validateCreateAmad } = require('./amad.validator');

// Amad (Crop Arrival) endpoints
router.post('/amad', validateCreateAmad, amadController.createAmad);
router.post('/amad/:id/approve', amadController.approveAmad);

// Holdings endpoints
router.get('/holdings', amadController.getHoldings);

module.exports = router;
