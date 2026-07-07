const express = require('express');
const router = express.Router();
const storageController = require('./storage.controller');
const { validateRegisterColdStorage } = require('./storage.validator');

router.get('/cold-storages', storageController.getColdStorages);
router.post('/cold-storages', validateRegisterColdStorage, storageController.registerColdStorage);
router.get('/cold-storage/summary', storageController.getSummary);

module.exports = router;
