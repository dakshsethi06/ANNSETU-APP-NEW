const express = require('express');
const router = express.Router();
const otaController = require('./ota.controller');

router.get('/ota/check', otaController.checkUpdate);

module.exports = router;
