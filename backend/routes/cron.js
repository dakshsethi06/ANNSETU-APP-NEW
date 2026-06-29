const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

router.post('/cron/crop-aging', cronController.processCropAging);

module.exports = router;
