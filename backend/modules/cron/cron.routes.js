const express = require('express');
const router = express.Router();
const cronController = require('./cron.controller');

router.post('/cron/crop-aging', cronController.processCropAging);

module.exports = router;
