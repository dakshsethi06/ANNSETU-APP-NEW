const express = require('express');
const router = express.Router();
const telemetryController = require('./telemetry.controller');

// Bulk data ingestion endpoint for Disaster Recovery Sync
router.post('/telemetry/bulk', telemetryController.bulkSync);

module.exports = router;
