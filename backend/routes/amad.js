const express = require('express');
const router = express.Router();
const amadController = require('../controllers/amadController');

// Amad (Crop Arrival) endpoints
router.post('/amad', amadController.createAmad);

// Holdings endpoints
router.get('/holdings', amadController.getHoldings);

module.exports = router;
