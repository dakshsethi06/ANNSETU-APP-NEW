const db = require('../../config/database');
const userSync = require('./repositories/userSync.repository');

async function getAppNotifications(farmerId) {
  const dbNotifsRes = await db.query(
    `SELECT id, "lotId", type, title, message, icon, "isRead", "createdAt", "actionUrl" 
     FROM "AppNotification" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
    [farmerId]
  );
  return dbNotifsRes.rows;
}

async function getPendingBills(farmerId) {
  const billsRes = await db.query(
    `SELECT id, "invoiceNumber", amount, "paidAmount", status, "dueDate", "createdAt", "periodLabel" 
     FROM "BillingEntry" WHERE "farmerId" = $1 AND status = 'PENDING'`,
    [farmerId]
  );
  return billsRes.rows;
}

async function markNotificationAsRead(id) {
  const result = await db.query(
    `UPDATE "AppNotification" SET "isRead" = true, "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
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

async function checkColdStorageExists(userId) {
  const csCheck = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [userId]);
  return csCheck.rows.length > 0;
}

async function getProcessedTransactionsSql(userId, isCS) {
  const sql = isCS
    ? 'SELECT "packetsDispatched", status FROM "NikasiTransaction" WHERE "coldStorageId" = $1 AND "status" = \'DISPATCHED\''
    : 'SELECT "packetsDispatched", status FROM "NikasiTransaction" WHERE "farmerId" = $1 AND "status" != \'CREATED\'';
  const res = await db.query(sql, [userId]);
  return res.rows;
}

async function checkPaymentExists(paymentId) {
  const payCheck = await db.query('SELECT id FROM "Payment" WHERE id = $1', [paymentId]);
  return payCheck.rows.length > 0;
}

async function getUnreadNotifications() {
  const result = await db.query('SELECT * FROM "AppNotification" WHERE "isRead" = false');
  return result.rows;
}

async function deleteNotification(id) {
  await db.query('DELETE FROM "AppNotification" WHERE id = $1', [id]);
}

async function getBillingEntryDetails(billId) {
  const billRes = await db.query('SELECT "farmerId", amount, "periodLabel" FROM "BillingEntry" WHERE id = $1', [billId]);
  return billRes.rows[0];
}

async function getFarmerColdStorageId(farmerId) {
  const fdRes = await db.query('SELECT "coldStorageId" FROM "Farmer" WHERE id = $1', [farmerId]);
  return fdRes.rows[0]?.coldStorageId;
}

async function upsertBillingNotification(id, coldStorageId, farmerId, message) {
  await db.query(
    `INSERT INTO "AppNotification" ("id", "coldStorageId", "userId", "type", "title", "message", "isRead", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'billing', 'Payment Due', $4, true, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET "isRead" = true, "updatedAt" = NOW()`,
    [id, coldStorageId, farmerId, message]
  );
}

async function getNotificationUserId(id) {
  const checkRes = await db.query('SELECT "userId" FROM "AppNotification" WHERE id = $1', [id]);
  return checkRes.rows[0]?.userId;
}

module.exports = {
  getAppNotifications,
  getPendingBills,
  markNotificationAsRead,
  insertNotificationLog,
  insertAppNotification,
  resolveFarmerId,
  checkColdStorageExists,
  getProcessedTransactionsSql,
  checkPaymentExists,
  getUnreadNotifications,
  deleteNotification,
  getBillingEntryDetails,
  getFarmerColdStorageId,
  upsertBillingNotification,
  getNotificationUserId,
  getUserForFarmer: userSync.getUserForFarmer,
  getFarmerDetails: userSync.getFarmerDetails,
  insertShadowUser: userSync.insertShadowUser,
  upsertUserPushToken: userSync.upsertUserPushToken
};
