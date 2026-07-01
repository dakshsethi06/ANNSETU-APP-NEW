const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');

// Farmers endpoints
router.get('/farmers', farmerController.getFarmers);
router.post('/farmers', farmerController.registerFarmer);
router.get('/farmers/:id/ledger', farmerController.getLedger);

module.exports = router;
