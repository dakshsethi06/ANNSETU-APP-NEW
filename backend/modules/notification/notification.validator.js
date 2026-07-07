/**
 * Notification request validation middleware.
 */

function validateGetNotifications(req, res, next) {
  const { farmerId } = req.query;
  if (!farmerId) {
    return res.status(400).json({ success: false, error: 'farmerId is required' });
  }
  next();
}

function validateRegisterPushToken(req, res, next) {
  const { userId, pushToken } = req.body;
  if (!userId || !pushToken) {
    return res.status(400).json({
      success: false,
      error: 'userId and pushToken are required fields.'
    });
  }
  next();
}

module.exports = { validateGetNotifications, validateRegisterPushToken };
