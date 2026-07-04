const notificationRepository = require('./notification.repository');
const db = require('../../config/database');

async function getNotifications(req, res) {
  const { farmerId } = req.query;
  if (!farmerId) return res.status(400).json({ success: false, error: 'farmerId is required' });

  try {
    const notifications = [];
    const now = new Date();

    // Identify if the logged-in user is a cold storage or a farmer
    let processedTxs = [];
    let isColdStorage = false;

    const csCheck = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [farmerId]);
    if (csCheck.rows.length > 0) {
      isColdStorage = true;
      // Fetch DISPATCHED (delivered) transactions for this cold storage
      const txsRes = await db.query(
        'SELECT "packetsDispatched", status FROM "NikasiTransaction" WHERE "coldStorageId" = $1 AND "status" = \'DISPATCHED\'',
        [farmerId]
      );
      processedTxs = txsRes.rows;
    } else {
      // Fetch non-CREATED (approved/in-transit/dispatched) transactions for this farmer
      const txsRes = await db.query(
        'SELECT "packetsDispatched", status FROM "NikasiTransaction" WHERE "farmerId" = $1 AND "status" != \'CREATED\'',
        [farmerId]
      );
      processedTxs = txsRes.rows;
    }

    const dbNotifs = await notificationRepository.getAppNotifications(farmerId);
    for (const item of dbNotifs) {
      // Check if it is a dispatch/approval notification (handles both pending approval for farmer and approved dispatch for cold storage)
      const match = item.message.match(/dispatch\s+(?:of\s+)?(\d+)\s+bags/i);
      if (match && (
        item.title.toLowerCase().includes('dispatch') || 
        item.title.toLowerCase().includes('approval') ||
        item.title.toLowerCase().includes('approved')
      )) {
        const bagsCount = parseInt(match[1], 10);
        const isProcessed = processedTxs.some(tx => tx.packetsDispatched === bagsCount);
        if (isProcessed) {
          // Stale notification! Delete from database and skip rendering it
          await db.query('DELETE FROM "AppNotification" WHERE id = $1', [item.id]);
          continue;
        }
      }

      const createdAt = new Date(item.createdAt);
      const diffTime = Math.abs(now - createdAt);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;
      let timeLabel = `${diffDays}d ago`;
      if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60)) || 0;
        if (diffHours > 0) {
          timeLabel = `${diffHours}h ago`;
        } else {
          const diffMins = Math.floor(diffTime / (1000 * 60)) || 0;
          timeLabel = diffMins > 0 ? `${diffMins}m ago` : 'Just now';
        }
      }
      notifications.push({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        createdAt: item.createdAt,
        isRead: item.isRead,
        timeLabel,
        actionUrl: item.actionUrl
      });
    }

    const pendingBills = await notificationRepository.getPendingBills(farmerId);
    pendingBills.forEach(bill => {
      const dueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(new Date(bill.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 15) {
        const timeAgoMs = now - new Date(bill.createdAt);
        const timeAgoDays = Math.floor(timeAgoMs / (1000 * 60 * 60 * 24)) || 0;
        let timeLabel = `${timeAgoDays}d ago`;
        if (timeAgoDays === 0) {
          const timeAgoHours = Math.floor(timeAgoMs / (1000 * 60 * 60)) || 0;
          if (timeAgoHours > 0) {
            timeLabel = `${timeAgoHours}h ago`;
          } else {
            const timeAgoMins = Math.floor(timeAgoMs / (1000 * 60)) || 0;
            timeLabel = timeAgoMins > 0 ? `${timeAgoMins}m ago` : 'Just now';
          }
        }
        notifications.push({
          id: `bill-${bill.id}`,
          title: 'Payment Due',
          message: `Storage rent of ₹${parseFloat(bill.amount).toLocaleString('en-IN')} is due for ${bill.periodLabel || 'recent storage period'}.`,
          type: 'billing',
          createdAt: bill.createdAt,
          isRead: false,
          timeLabel
        });
      }
    });

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('PostgreSQL notifications GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
}

async function markAsRead(req, res) {
  const { id } = req.params;
  try {
    if (id.startsWith('bill-')) {
      return res.json({ success: true });
    }

    // Check the notification to see who it belongs to
    const checkRes = await db.query('SELECT "userId" FROM "AppNotification" WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    const userId = checkRes.rows[0].userId;

    // Check if this userId belongs to a cold storage account
    const csCheck = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [userId]);
    if (csCheck.rows.length > 0) {
      // It is a cold storage account! Delete the notification from database
      await db.query('DELETE FROM "AppNotification" WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Notification deleted' });
    }

    const notification = await notificationRepository.markNotificationAsRead(id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    return res.json({ success: true, notification });
  } catch (error) {
    console.error('PostgreSQL notification read error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
}

module.exports = { getNotifications, markAsRead };
