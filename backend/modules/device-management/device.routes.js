const express = require('express');
const router = express.Router();
const deviceController = require('./device.controller');

router.post('/devices/register', deviceController.registerDevice);
router.put('/devices/:id/status', deviceController.updateDeviceStatus);

module.exports = router;
