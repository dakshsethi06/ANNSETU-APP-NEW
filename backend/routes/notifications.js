const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/notifications', notificationController.getNotifications);
router.post('/notifications/:id/read', notificationController.markAsRead);

module.exports = router;
