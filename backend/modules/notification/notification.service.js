const notificationRepository = require('./notification.repository');
const db = require('../../config/database');
const { DEFAULT_COLD_STORAGE_ID } = require('../../config/constants');

/**
 * Compute a human-readable time label from a date.
 */
function computeTimeLabel(createdAt) {
  const diff = Math.abs(new Date() - new Date(createdAt));
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Resolve processed dispatch transactions list for a user.
 */
async function getProcessedTransactions(userId) {
  const csCheck = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [userId]);
  const isCS = csCheck.rows.length > 0;
  const sql = isCS
    ? 'SELECT "packetsDispatched", status FROM "NikasiTransaction" WHERE "coldStorageId" = $1 AND "status" = \'DISPATCHED\''
    : 'SELECT "packetsDispatched", status FROM "NikasiTransaction" WHERE "farmerId" = $1 AND "status" != \'CREATED\'';
  const res = await db.query(sql, [userId]);
  return res.rows;
}

/**
 * Check if a notification is stale (payment verified or dispatch already processed).
 */
async function checkStale(item, processedTxsMap) {
  if (item.actionUrl?.includes('/payment-verification/')) {
    const paymentId = item.actionUrl.split('/').pop();
    const payCheck = await db.query('SELECT id FROM "Payment" WHERE id = $1', [paymentId]);
    return payCheck.rows.length === 0;
  }

  const match = item.message.match(/dispatch\s+(?:of\s+)?(\d+)\s+bags/i);
  const isDispatch = ['dispatch', 'approval', 'approved'].some(t => item.title.toLowerCase().includes(t));
  if (match && isDispatch) {
    const bagsCount = parseInt(match[1], 10);
    let processedTxs = processedTxsMap.get(item.userId);
    if (!processedTxs) {
      processedTxs = await getProcessedTransactions(item.userId);
      processedTxsMap.set(item.userId, processedTxs);
    }
    return processedTxs.some(tx => tx.packetsDispatched === bagsCount);
  }
  return false;
}

/**
 * Fetch notifications for a user (farmer or cold storage).
 * Read-only method. Filters stale items dynamically.
 */
async function fetchNotifications(farmerId) {
  const notifications = [];
  const processedTxsMap = new Map();
  const dbNotifs = await notificationRepository.getAppNotifications(farmerId);
  const readNotifIds = new Set();

  for (const item of dbNotifs) {
    if (item.isRead) {
      readNotifIds.add(item.id);
      continue;
    }

    if (await checkStale(item, processedTxsMap)) {
      continue;
    }

    notifications.push({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      createdAt: item.createdAt,
      isRead: item.isRead,
      timeLabel: computeTimeLabel(item.createdAt),
      actionUrl: item.actionUrl
    });
  }

  // Inject pending bill notifications
  const pendingBills = await notificationRepository.getPendingBills(farmerId);
  const now = new Date();

  for (const bill of pendingBills) {
    const billNotifId = `bill-${bill.id}`;
    if (readNotifIds.has(billNotifId)) continue;

    const dueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(new Date(bill.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    if (Math.ceil((dueDate - now) / 86400000) <= 15) {
      notifications.push({
        id: billNotifId,
        title: 'Payment Due',
        message: `Storage rent of ₹${parseFloat(bill.amount).toLocaleString('en-IN')} is due for ${bill.periodLabel || 'recent storage period'}.`,
        type: 'billing',
        createdAt: bill.createdAt,
        isRead: false,
        timeLabel: computeTimeLabel(bill.createdAt)
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Clean up stale notifications from the database.
 */
async function cleanupStaleNotifications() {
  const result = await db.query('SELECT * FROM "AppNotification" WHERE "isRead" = false');
  const processedTxsMap = new Map();
  let deletedCount = 0;

  for (const item of result.rows) {
    if (await checkStale(item, processedTxsMap)) {
      await db.query('DELETE FROM "AppNotification" WHERE id = $1', [item.id]);
      deletedCount++;
    }
  }

  return { deletedCount };
}

/**
 * Mark a notification as read.
 * Handles bill notifications, cold storage account deletions, and standard mark-as-read.
 */
async function markNotificationRead(id) {
  if (id.startsWith('bill-')) {
    const billIdStr = id.replace('bill-', '');
    const billRes = await db.query('SELECT "farmerId", amount, "periodLabel" FROM "BillingEntry" WHERE id = $1', [billIdStr]);

    if (billRes.rows.length > 0) {
      const { farmerId, amount, periodLabel } = billRes.rows[0];
      const fdRes = await db.query('SELECT "coldStorageId" FROM "Farmer" WHERE id = $1', [farmerId]);
      const coldStorageId = fdRes.rows[0]?.coldStorageId || DEFAULT_COLD_STORAGE_ID;
      const message = `Storage rent of ₹${parseFloat(amount).toLocaleString('en-IN')} is due for ${periodLabel || 'recent storage period'}.`;

      await db.query(
        `INSERT INTO "AppNotification" ("id", "coldStorageId", "userId", "type", "title", "message", "isRead", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'billing', 'Payment Due', $4, true, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET "isRead" = true, "updatedAt" = NOW()`,
        [id, coldStorageId, farmerId, message]
      );
    }
    return { message: 'Bill notification marked as read' };
  }

  const checkRes = await db.query('SELECT "userId" FROM "AppNotification" WHERE id = $1', [id]);
  if (checkRes.rows.length === 0) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
  const userId = checkRes.rows[0].userId;

  const csCheck = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [userId]);
  if (csCheck.rows.length > 0) {
    await db.query('DELETE FROM "AppNotification" WHERE id = $1', [id]);
    return { message: 'Notification deleted' };
  }

  const notification = await notificationRepository.markNotificationAsRead(id);
  if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
  return { notification };
}

/**
 * Register a push token for a user.
 */
async function registerUserPushToken(userId, pushToken) {
  const resolvedUserId = await notificationRepository.resolveFarmerId(userId.replace('+91', '').trim());
  await notificationRepository.upsertUserPushToken(resolvedUserId, `farmer_${resolvedUserId}@annsetu.local`, pushToken);
}

module.exports = {
  fetchNotifications,
  cleanupStaleNotifications,
  markNotificationRead,
  registerUserPushToken
};
