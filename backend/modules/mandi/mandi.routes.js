const express = require('express');
const router = express.Router();
const mandiController = require('./mandi.controller');

router.get('/mandi-prices', mandiController.getMandiPrices);

module.exports = router;
