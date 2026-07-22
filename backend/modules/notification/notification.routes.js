const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { validateGetNotifications, validateRegisterPushToken } = require('./notification.validator');

router.get('/notifications', validateGetNotifications, notificationController.getNotifications);
router.post('/notifications/cleanup', notificationController.cleanupNotifications);
router.post('/notifications/:id/read', notificationController.markAsRead);
router.delete('/notifications/:id', notificationController.deleteNotification);
router.post('/users/push-token', validateRegisterPushToken, notificationController.registerPushToken);

module.exports = router;

