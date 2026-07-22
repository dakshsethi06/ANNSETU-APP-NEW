const notificationService = require('./notification.service');

async function getNotifications(req, res) {
  try {
    const notifications = await notificationService.fetchNotifications(req.query.farmerId);
    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('PostgreSQL notifications GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
}

async function markAsRead(req, res) {
  try {
    const result = await notificationService.markNotificationRead(req.params.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('PostgreSQL notification read error:', error.message);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to mark notification as read' });
  }
}

async function registerPushToken(req, res) {
  try {
    await notificationService.registerUserPushToken(req.body.userId, req.body.pushToken);
    return res.json({ success: true, message: 'Push token registered successfully.' });
  } catch (err) {
    console.error('Error registering push token:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function cleanupNotifications(req, res) {
  try {
    const result = await notificationService.cleanupStaleNotifications();
    return res.json({ success: true, message: 'Stale notifications cleaned up successfully.', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Cleanup notifications error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to clean up stale notifications.' });
  }
}

async function deleteNotification(req, res) {
  try {
    const result = await notificationService.deleteNotificationById(req.params.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('PostgreSQL notification delete error:', error.message);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to delete notification' });
  }
}

module.exports = { getNotifications, markAsRead, registerPushToken, cleanupNotifications, deleteNotification };

