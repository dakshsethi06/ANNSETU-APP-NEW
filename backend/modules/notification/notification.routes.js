const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');

router.get('/notifications', notificationController.getNotifications);
router.post('/notifications/:id/read', notificationController.markAsRead);
router.post('/users/push-token', notificationController.registerPushToken);

module.exports = router;
