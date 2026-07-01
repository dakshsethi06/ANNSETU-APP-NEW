const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');

router.get('/dispatches', dispatchController.getDispatches);
router.post('/dispatches', dispatchController.createDispatch);
router.post('/dispatches/:id/approve', dispatchController.approveDispatch);

module.exports = router;
