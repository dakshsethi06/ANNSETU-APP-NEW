const db = require('../db');

/**
 * Logs outbound transactional notifications (SMS/Email) to the database.
 */
async function logOutboundNotification({
  coldStorageId = null,
  channel, // 'SMS' or 'EMAIL'
  eventType,
  recipientPhone = null,
  recipientEmail = null,
  recipientName = null,
  subject = null,
  message,
  status = 'SENT',
  provider = 'console',
  providerMessageId = null,
  relatedModel = null,
  relatedId = null,
  errorMessage = null,
  metadata = null
}) {
  if (!db) return null;

  try {
    const id = 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const now = new Date();

    // Redact 6-digit OTP codes from message before logging
    const redactedMessage = message.replace(/\b\d{6}\b/g, '******');

    const sql = `
      INSERT INTO "NotificationLog" (
        "id", "coldStorageId", "channel", "eventType", "recipientPhone", 
        "recipientEmail", "recipientName", "subject", "message", "status", 
        "provider", "providerMessageId", "relatedModel", "relatedId", "errorMessage", 
        "metadata", "sentAt", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const params = [
      id, coldStorageId, channel, eventType, recipientPhone,
      recipientEmail, recipientName, subject, redactedMessage, status,
      provider, providerMessageId, relatedModel, relatedId, errorMessage,
      metadata ? JSON.stringify(metadata) : null, status === 'SENT' ? now : null, now, now
    ];

    const result = await db.query(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error('Error logging outbound notification:', error.message);
    return null;
  }
}

/**
 * Automatically ensures a shadow row exists in the "User" table for the given farmer ID.
 */
async function ensureUserForFarmer(farmerId) {
  try {
    // Check if the user already exists in public.User
    const userRes = await db.query('SELECT id FROM "User" WHERE id = $1', [farmerId]);
    if (userRes.rows.length > 0) {
      return; // Already exists
    }

    // Retrieve the farmer's name and coldStorageId from Farmer table
    const farmerRes = await db.query('SELECT name, "coldStorageId" FROM "Farmer" WHERE id = $1', [farmerId]);
    const farmer = farmerRes.rows[0];
    const name = farmer ? farmer.name : 'Farmer';
    const coldStorageId = farmer ? farmer.coldStorageId : 'cmmp9txv0000ai3t4wush9trs';
    const email = `farmer_${farmerId}@annsetu.local`;
    const now = new Date();

    // Insert the shadow row in public.User
    await db.query(
      `INSERT INTO "User" (
        "id", "name", "email", "passwordHash", "role", 
        "active", "createdAt", "updatedAt", "coldStorageId", "sessionVersion"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [farmerId, name, email, 'dummy_hash', 'OPERATOR', true, now, now, coldStorageId, 1]
    );
    console.log(`[Notification Engine] Created shadow User row for Farmer ${farmerId} (${name})`);
  } catch (err) {
    console.error(`[Notification Engine] Error in ensureUserForFarmer for ${farmerId}:`, err.message);
  }
}

/**
 * Creates in-app dashboard notifications for active cold storage users/farmers.
 */
async function createAppNotification({
  coldStorageId = 'cmmp9txv0000ai3t4wush9trs',
  userId, // The farmer/user ID
  lotId = null,
  type = 'info', // 'warning', 'billing', 'info', etc.
  title,
  message,
  icon = 'info',
  actionUrl = null,
  alertDate = null
}) {
  if (!db) return null;

  try {
    if (userId) {
      await ensureUserForFarmer(userId);
    }

    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const now = new Date();
    const finalAlertDate = alertDate || now; // default to today

    const sql = `
      INSERT INTO "AppNotification" (
        "id", "coldStorageId", "userId", "lotId", "type", 
        "title", "message", "icon", "actionUrl", "isRead", 
        "alertDate", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const params = [
      id, coldStorageId, userId, lotId, type,
      title, message, icon, actionUrl, false,
      finalAlertDate, now, now
    ];

    const result = await db.query(sql, params);
    return result.rows[0];
  } catch (error) {
    // Catch unique constraint violation (PostgreSQL code 23505)
    // unique constraint is: @@unique([userId, lotId, type, alertDate])
    if (error.code === '23505') {
      console.log(`Duplicate notification skipped for User ${userId}, Lot ${lotId}, Type ${type} on date ${alertDate}`);
      return null;
    }
    console.error('Error creating app notification:', error.message);
    return null;
  }
}

module.exports = {
  logOutboundNotification,
  createAppNotification
};
