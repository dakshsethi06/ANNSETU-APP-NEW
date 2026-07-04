const express = require('express');
const router = express.Router();
const dispatchController = require('./dispatch.controller');

router.get('/dispatches', dispatchController.getDispatches);
router.post('/dispatches', dispatchController.createDispatch);
router.post('/dispatches/:id/approve', dispatchController.approveDispatch);
router.post('/dispatches/:id/deliver', dispatchController.deliverDispatch);

module.exports = router;
