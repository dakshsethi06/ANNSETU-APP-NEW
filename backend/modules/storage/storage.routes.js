const express = require('express');
const router = express.Router();
const storageController = require('./storage.controller');

router.get('/cold-storages', storageController.getColdStorages);
router.post('/cold-storages', storageController.registerColdStorage);
router.get('/cold-storage/summary', storageController.getSummary);

module.exports = router;
