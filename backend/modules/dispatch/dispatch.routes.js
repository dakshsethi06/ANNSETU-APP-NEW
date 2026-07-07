const express = require('express');
const router = express.Router();
const dispatchController = require('./dispatch.controller');
const validator = require('./dispatch.validator');

router.get('/dispatches', validator.validateGetDispatches, dispatchController.getDispatches);
router.post('/dispatches', validator.validateCreateDispatch, dispatchController.createDispatch);
router.post('/dispatches/:id/approve', validator.validateApproveDispatch, dispatchController.approveDispatch);
router.post('/dispatches/:id/deliver', dispatchController.deliverDispatch);

module.exports = router;
