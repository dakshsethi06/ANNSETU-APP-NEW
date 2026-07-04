const db = require('../db');

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

module.exports = { getAppNotifications, getPendingBills, markNotificationAsRead };
