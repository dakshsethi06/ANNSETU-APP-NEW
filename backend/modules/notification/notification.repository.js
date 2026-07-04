const db = require('../../config/database');

async function getAppNotifications(farmerId) {
  const dbNotifsRes = await db.query(
    `SELECT id, "lotId", type, title, message, icon, "isRead", "createdAt", "actionUrl" 
     FROM "AppNotification" 
     WHERE "userId" = $1 
     ORDER BY "createdAt" DESC`,
    [farmerId]
  );
  return dbNotifsRes.rows;
}

async function getPendingBills(farmerId) {
  const billsRes = await db.query(
    `SELECT id, "invoiceNumber", amount, "paidAmount", status, "dueDate", "createdAt", "periodLabel" 
     FROM "BillingEntry" 
     WHERE "farmerId" = $1 AND status = 'PENDING'`,
    [farmerId]
  );
  return billsRes.rows;
}

async function markNotificationAsRead(id) {
  const result = await db.query(
    `UPDATE "AppNotification" 
     SET "isRead" = true, "updatedAt" = NOW() 
     WHERE id = $1 
     RETURNING *`,
    [id]
  );
  return result.rows[0];
}

async function insertNotificationLog(params) {
  const sql = `
    INSERT INTO "NotificationLog" (
      "id", "coldStorageId", "channel", "eventType", "recipientPhone", 
      "recipientEmail", "recipientName", "subject", "message", "status", 
      "provider", "providerMessageId", "relatedModel", "relatedId", "errorMessage", 
      "metadata", "sentAt", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `;
  const result = await db.query(sql, params);
  return result.rows[0];
}

async function getUserForFarmer(farmerId) {
  const userRes = await db.query('SELECT id FROM "User" WHERE id = $1', [farmerId]);
  return userRes.rows.length > 0;
}

async function getFarmerDetails(farmerId) {
  const farmerRes = await db.query('SELECT name, "coldStorageId" FROM "Farmer" WHERE id = $1', [farmerId]);
  return farmerRes.rows[0];
}

async function insertShadowUser(params) {
  await db.query(
    `INSERT INTO "User" (
      "id", "name", "email", "passwordHash", "role", 
      "active", "createdAt", "updatedAt", "coldStorageId", "sessionVersion"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id) DO NOTHING`, params
  );
}

async function insertAppNotification(params) {
  const sql = `
    INSERT INTO "AppNotification" (
      "id", "coldStorageId", "userId", "lotId", "type", 
      "title", "message", "icon", "actionUrl", "isRead", 
      "alertDate", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;
  const result = await db.query(sql, params);
  return result.rows[0];
}

async function resolveFarmerId(phoneOrId) {
  const farmerRes = await db.query(
    'SELECT id FROM "Farmer" WHERE phone = $1 OR id = $1 LIMIT 1',
    [phoneOrId]
  );
  return farmerRes.rows.length > 0 ? farmerRes.rows[0].id : phoneOrId;
}

async function upsertUserPushToken(userId, email, pushToken) {
  await db.query(
    `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "active", "createdAt", "updatedAt", "coldStorageId", "sessionVersion", "pushToken")
     VALUES ($1, $1, $2, 'dummy_hash', 'OPERATOR', true, NOW(), NOW(), 'cmmp9txv0000ai3t4wush9trs', 1, $3)
     ON CONFLICT (id) DO UPDATE SET "pushToken" = EXCLUDED."pushToken", "updatedAt" = NOW()`,
    [userId, email, pushToken]
  );
}

module.exports = {
  getAppNotifications,
  getPendingBills,
  markNotificationAsRead,
  insertNotificationLog,
  getUserForFarmer,
  getFarmerDetails,
  insertShadowUser,
  insertAppNotification,
  resolveFarmerId,
  upsertUserPushToken
};
