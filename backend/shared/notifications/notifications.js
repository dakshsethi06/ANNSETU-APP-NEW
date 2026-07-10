const appNotificationRepository = require('../../modules/notification/notification.repository');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { DEFAULT_COLD_STORAGE_ID } = require('../../config/constants');

async function logOutboundNotification({
  coldStorageId = null, channel, eventType, recipientPhone = null, recipientEmail = null, recipientName = null,
  subject = null, message, status = 'SENT', provider = 'console', providerMessageId = null, relatedModel = null,
  relatedId = null, errorMessage = null, metadata = null
}) {
  try {
    const id = 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const now = new Date();
    const redactedMessage = message.replace(/\b\d{6}\b/g, '******');
    const params = [id, coldStorageId, channel, eventType, recipientPhone, recipientEmail, recipientName, subject, redactedMessage, status, provider, providerMessageId, relatedModel, relatedId, errorMessage, metadata ? JSON.stringify(metadata) : null, status === 'SENT' ? now : null, now, now];
    return await appNotificationRepository.insertNotificationLog(params);
  } catch (error) { console.error('Error logging outbound notification:', error.message); return null; }
}

async function ensureUserForFarmer(farmerId) {
  try {
    const exists = await appNotificationRepository.getUserForFarmer(farmerId);
    if (exists) return;
    const farmer = await appNotificationRepository.getFarmerDetails(farmerId);
    const name = farmer ? farmer.name : 'Farmer';
    const coldStorageId = farmer ? farmer.coldStorageId : DEFAULT_COLD_STORAGE_ID;
    const mpin = (farmer && farmer.mpin) ? farmer.mpin : '1234';
    const email = (farmer && farmer.email) ? farmer.email : `farmer_${farmerId}@annsetu.local`;
    const now = new Date();
    await appNotificationRepository.insertShadowUser([farmerId, name, email, mpin, 'OPERATOR', true, now, now, coldStorageId, 1]);
  } catch (err) { console.error(`Error in ensureUserForFarmer for ${farmerId}:`, err.message); }
}

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
async function sendEmailWithLog({
  to,
  subject,
  text = null,
  html = null,
  coldStorageId = null,
  eventType = 'SYSTEM_ALERT',
  recipientName = null,
  relatedModel = null,
  relatedId = null,
  metadata = null
}) {
  try {
    const result = await sendEmail({ to, subject, text, html });
    await logOutboundNotification({
      coldStorageId,
      channel: 'EMAIL',
      eventType,
      recipientEmail: to,
      recipientName,
      subject,
      message: text || html || '',
      status: 'SENT',
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      relatedModel,
      relatedId,
      metadata
    });
    return result;
  } catch (error) {
    const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    await logOutboundNotification({
      coldStorageId,
      channel: 'EMAIL',
      eventType,
      recipientEmail: to,
      recipientName,
      subject,
      message: text || html || '',
      status: 'FAILED',
      provider: isConfigured ? 'smtp' : 'console',
      errorMessage: error.message,
      relatedModel,
      relatedId,
      metadata
    });
    throw error;
  }
}

async function sendSMSWithLog({
  to,
  message,
  coldStorageId = null,
  eventType = 'SYSTEM_ALERT',
  recipientName = null,
  relatedModel = null,
  relatedId = null,
  metadata = null
}) {
  try {
    const result = await sendSMS({ to, message });
    await logOutboundNotification({
      coldStorageId,
      channel: 'SMS',
      eventType,
      recipientPhone: to,
      recipientName,
      message,
      status: 'SENT',
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      relatedModel,
      relatedId,
      metadata
    });
    return result;
  } catch (error) {
    const isSmsConfigured = !!(
      (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) ||
      process.env.SMS_API_URL
    );
    await logOutboundNotification({
      coldStorageId,
      channel: 'SMS',
      eventType,
      recipientPhone: to,
      recipientName,
      message,
      status: 'FAILED',
      provider: isSmsConfigured ? 'sms-api' : 'console',
      errorMessage: error.message,
      relatedModel,
      relatedId,
      metadata
    });
    throw error;
  }
}

async function createAppNotification({ coldStorageId = DEFAULT_COLD_STORAGE_ID, userId, lotId = null, type = 'info', title, message, icon = 'info', actionUrl = null, alertDate = null }) {
  try {
    if (userId) await ensureUserForFarmer(userId);
    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const now = new Date();
    const params = [id, coldStorageId, userId, lotId, type, title, message, icon, actionUrl, false, alertDate || now, now, now];
    const result = await appNotificationRepository.insertAppNotification(params);
    if (result && userId) {
      try {
        const { sendPushNotification } = require('./pushNotifications');
        sendPushNotification(userId, title, message, { actionUrl });
      } catch (pushErr) {
        console.warn('Failed to dispatch background push:', pushErr.message);
      }

      // Automatically send SMS & Email via consolidated logging dispatchers
      try {
        const db = require('../../config/database');
        const farmerRes = await db.query('SELECT name, phone FROM "Farmer" WHERE id = $1', [userId]);
        const userRes = await db.query('SELECT email FROM "User" WHERE id = $1', [userId]);

        let recipientPhone = null;
        let recipientEmail = null;
        let recipientName = null;

        if (farmerRes.rows.length > 0) {
          recipientPhone = farmerRes.rows[0].phone;
          recipientName = farmerRes.rows[0].name;
          recipientEmail = userRes.rows.length > 0 ? userRes.rows[0].email : `farmer_${userId}@annsetu.local`;
        } else {
          const csRes = await db.query('SELECT "displayName" AS name, phone, email FROM "ColdStorageOnboarding" WHERE id = $1', [userId]);
          if (csRes.rows.length > 0) {
            recipientPhone = csRes.rows[0].phone;
            recipientName = csRes.rows[0].name;
            recipientEmail = csRes.rows[0].email;
          }
        }

        if (recipientPhone || recipientEmail) {
          if (recipientPhone) {
            const formattedPhone = recipientPhone.startsWith('+') ? recipientPhone : `+91${recipientPhone}`;
            await sendSMSWithLog({
              to: formattedPhone,
              message: `[${title}] ${message}`,
              coldStorageId,
              eventType: 'AUTO_ALERT_SMS',
              recipientName,
              relatedModel: lotId ? 'AmadLot' : null,
              relatedId: lotId
            }).catch(err => console.warn('[Auto Notification Hook] Failed to send SMS:', err.message));
          }

          if (recipientEmail) {
            await sendEmailWithLog({
              to: recipientEmail,
              subject: `AnnSetu Alert: ${title}`,
              text: `Dear ${recipientName || 'User'},\n\n${message}\n\nThank you,\nAnnSetu Team`,
              coldStorageId,
              eventType: 'AUTO_ALERT_EMAIL',
              recipientName,
              relatedModel: lotId ? 'AmadLot' : null,
              relatedId: lotId
            }).catch(err => console.warn('[Auto Notification Hook] Failed to send Email:', err.message));
          }
        }
      } catch (autoNotifErr) {
        console.warn('[Auto Notification Hook] Error in background dispatch:', autoNotifErr.message);
      }
    }
    return result;
  } catch (error) {
    if (error.code === '23505') return null;
    console.error('Error creating app notification:', error.message);
    return null;
  }
}

module.exports = {
  logOutboundNotification,
  createAppNotification,
  sendEmail: sendEmailWithLog,
  sendSMS: sendSMSWithLog
};
