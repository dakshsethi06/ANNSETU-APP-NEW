const notificationRepository = require('./notification.repository');
const db = require('../../config/database');

/**
 * Compute a human-readable time label from a date.
 */
function computeTimeLabel(createdAt) {
  const now = new Date();
  const diffTime = Math.abs(now - new Date(createdAt));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;

  if (diffDays > 0) return `${diffDays}d ago`;

  const diffHours = Math.floor(diffTime / (1000 * 60 * 60)) || 0;
  if (diffHours > 0) return `${diffHours}h ago`;

  const diffMins = Math.floor(diffTime / (1000 * 60)) || 0;
  return diffMins > 0 ? `${diffMins}m ago` : 'Just now';
}

/**
 * Fetch notifications for a user (farmer or cold storage).
 * Handles stale notification cleanup, bill injection, and sorting.
 */
async function fetchNotifications(farmerId) {
  const notifications = [];

  // Identify if the logged-in user is a cold storage or a farmer
  let processedTxs = [];
  const csCheck = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [farmerId]);

  if (csCheck.rows.length > 0) {
    const txsRes = await db.query(
      'SELECT "packetsDispatched", status FROM "NikasiTransaction" WHERE "coldStorageId" = $1 AND "status" = \'DISPATCHED\'',
      [farmerId]
    );
    processedTxs = txsRes.rows;
  } else {
    const txsRes = await db.query(
      'SELECT "packetsDispatched", status FROM "NikasiTransaction" WHERE "farmerId" = $1 AND "status" != \'CREATED\'',
      [farmerId]
    );
    processedTxs = txsRes.rows;
  }

  const dbNotifs = await notificationRepository.getAppNotifications(farmerId);
  const readNotifIds = new Set();

  for (const item of dbNotifs) {
    if (item.isRead) {
      readNotifIds.add(item.id);
      continue;
    }

    // Check if this is a payment verification notification and if the payment record exists
    if (item.actionUrl && item.actionUrl.includes('/payment-verification/')) {
      const paymentId = item.actionUrl.split('/').pop();
      const payCheck = await db.query('SELECT id FROM "Payment" WHERE id = $1', [paymentId]);
      if (payCheck.rows.length === 0) {
        await db.query('DELETE FROM "AppNotification" WHERE id = $1', [item.id]);
        continue;
      }
    }

    // Check if it is a stale dispatch/approval notification
    const match = item.message.match(/dispatch\s+(?:of\s+)?(\d+)\s+bags/i);
    if (match && (
      item.title.toLowerCase().includes('dispatch') ||
      item.title.toLowerCase().includes('approval') ||
      item.title.toLowerCase().includes('approved')
    )) {
      const bagsCount = parseInt(match[1], 10);
      const isProcessed = processedTxs.some(tx => tx.packetsDispatched === bagsCount);
      if (isProcessed) {
        await db.query('DELETE FROM "AppNotification" WHERE id = $1', [item.id]);
        continue;
      }
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

    const dueDate = bill.dueDate
      ? new Date(bill.dueDate)
      : new Date(new Date(bill.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 15) {
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

  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return notifications;
}

/**
 * Mark a notification as read.
 * Handles bill notifications, cold storage account deletions, and standard mark-as-read.
 */
async function markNotificationRead(id) {
  // Bill notification handling
  if (id.startsWith('bill-')) {
    const billIdStr = id.replace('bill-', '');
    const billRes = await db.query('SELECT "farmerId", amount, "periodLabel" FROM "BillingEntry" WHERE id = $1', [billIdStr]);

    if (billRes.rows.length > 0) {
      const bill = billRes.rows[0];
      const farmerId = bill.farmerId;
      const farmerDetailsRes = await db.query('SELECT "coldStorageId" FROM "Farmer" WHERE id = $1', [farmerId]);
      const coldStorageId = farmerDetailsRes.rows.length > 0 ? farmerDetailsRes.rows[0].coldStorageId : 'cmmp9txv0000ai3t4wush9trs';
      const now = new Date();
      const title = 'Payment Due';
      const message = `Storage rent of ₹${parseFloat(bill.amount).toLocaleString('en-IN')} is due for ${bill.periodLabel || 'recent storage period'}.`;

      await db.query(
        `INSERT INTO "AppNotification" (
          "id", "coldStorageId", "userId", "type", "title", "message", "isRead", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, 'billing', $4, $5, true, $6, $6)
        ON CONFLICT (id) DO UPDATE SET "isRead" = true, "updatedAt" = NOW()`,
        [id, coldStorageId, farmerId, title, message, now]
      );
    }
    return { message: 'Bill notification marked as read' };
  }

  // Check who the notification belongs to
  const checkRes = await db.query('SELECT "userId" FROM "AppNotification" WHERE id = $1', [id]);
  if (checkRes.rows.length === 0) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  const userId = checkRes.rows[0].userId;

  // If cold storage account, delete the notification
  const csCheck = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [userId]);
  if (csCheck.rows.length > 0) {
    await db.query('DELETE FROM "AppNotification" WHERE id = $1', [id]);
    return { message: 'Notification deleted' };
  }

  // Standard mark-as-read
  const notification = await notificationRepository.markNotificationAsRead(id);
  if (!notification) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  return { notification };
}

/**
 * Register a push token for a user.
 */
async function registerUserPushToken(userId, pushToken) {
  const cleanUserId = userId.replace('+91', '').trim();
  const resolvedUserId = await notificationRepository.resolveFarmerId(cleanUserId);
  const email = `farmer_${resolvedUserId}@annsetu.local`;

  await notificationRepository.upsertUserPushToken(resolvedUserId, email, pushToken);
  console.log(`[Backend] Registered push token for userId ${resolvedUserId}: ${pushToken}`);
}

module.exports = { fetchNotifications, markNotificationRead, registerUserPushToken };
