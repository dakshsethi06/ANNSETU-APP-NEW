const appNotificationRepository = require('../repositories/appNotificationRepository');

async function logOutboundNotification({
  coldStorageId = null, channel, eventType, recipientPhone = null, recipientEmail = null, recipientName = null,
  subject = null, message, status = 'SENT', provider = 'console', providerMessageId = null, relatedModel = null,
  relatedId = null, errorMessage = null, metadata = null
}) {
  try {
    const id = 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const now = new Date();
    const redactedMessage = message.replace(/\b\d{6}\b/g, '******');
    const params = [ id, coldStorageId, channel, eventType, recipientPhone, recipientEmail, recipientName, subject, redactedMessage, status, provider, providerMessageId, relatedModel, relatedId, errorMessage, metadata ? JSON.stringify(metadata) : null, status === 'SENT' ? now : null, now, now ];
    return await appNotificationRepository.insertNotificationLog(params);
  } catch (error) { console.error('Error logging outbound notification:', error.message); return null; }
}

async function ensureUserForFarmer(farmerId) {
  try {
    const exists = await appNotificationRepository.getUserForFarmer(farmerId);
    if (exists) return;
    const farmer = await appNotificationRepository.getFarmerDetails(farmerId);
    const name = farmer ? farmer.name : 'Farmer';
    const coldStorageId = farmer ? farmer.coldStorageId : 'cmmp9txv0000ai3t4wush9trs';
    const now = new Date();
    await appNotificationRepository.insertShadowUser([farmerId, name, `farmer_${farmerId}@annsetu.local`, 'dummy_hash', 'OPERATOR', true, now, now, coldStorageId, 1]);
  } catch (err) { console.error(`Error in ensureUserForFarmer for ${farmerId}:`, err.message); }
}

async function createAppNotification({ coldStorageId = 'cmmp9txv0000ai3t4wush9trs', userId, lotId = null, type = 'info', title, message, icon = 'info', actionUrl = null, alertDate = null }) {
  try {
    if (userId) await ensureUserForFarmer(userId);
    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const now = new Date();
    const params = [ id, coldStorageId, userId, lotId, type, title, message, icon, actionUrl, false, alertDate || now, now, now ];
    const result = await appNotificationRepository.insertAppNotification(params);
    if (result && userId) {
      try {
        const { sendPushNotification } = require('./pushNotifications');
        sendPushNotification(userId, title, message, { actionUrl });
      } catch (pushErr) {
        console.warn('Failed to dispatch background push:', pushErr.message);
      }
    }
    return result;
  } catch (error) {
    if (error.code === '23505') return null;
    console.error('Error creating app notification:', error.message);
    return null;
  }
}

module.exports = { logOutboundNotification, createAppNotification };
