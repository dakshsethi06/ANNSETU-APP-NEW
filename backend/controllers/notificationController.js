const notificationRepository = require('../repositories/notificationRepository');

async function getNotifications(req, res) {
  const { farmerId } = req.query;
  if (!farmerId) return res.status(400).json({ success: false, error: 'farmerId is required' });

  try {
    const notifications = [];
    const now = new Date();

    const dbNotifs = await notificationRepository.getAppNotifications(farmerId);
    dbNotifs.forEach(item => {
      const createdAt = new Date(item.createdAt);
      const diffTime = Math.abs(now - createdAt);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;
      let timeLabel = `${diffDays}d ago`;
      if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60)) || 0;
        timeLabel = diffHours > 0 ? `${diffHours}h ago` : 'Just now';
      }
      notifications.push({ id: item.id, title: item.title, message: item.message, type: item.type, createdAt: item.createdAt, isRead: item.isRead, timeLabel });
    });

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
          timeLabel = timeAgoHours > 0 ? `${timeAgoHours}h ago` : 'Just now';
        }
        notifications.push({ id: `bill-${bill.id}`, title: 'Payment Due', message: `Storage rent of ₹${parseFloat(bill.amount).toLocaleString('en-IN')} is due for ${bill.periodLabel || 'recent storage period'}.`, type: 'billing', createdAt: bill.createdAt, isRead: false, timeLabel });
      }
    });

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('PostgreSQL notifications GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
}

module.exports = { getNotifications };
