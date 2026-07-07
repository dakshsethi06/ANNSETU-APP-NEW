const express = require('express');
const router = express.Router();
const amadController = require('./amad.controller');
const { validateCreateAmad } = require('./amad.validator');

// Amad (Crop Arrival) endpoints
router.post('/amad', validateCreateAmad, amadController.createAmad);

// Holdings endpoints
router.get('/holdings', amadController.getHoldings);

module.exports = router;
