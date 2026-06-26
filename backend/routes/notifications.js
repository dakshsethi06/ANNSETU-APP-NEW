const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/notifications?farmerId=...
router.get('/notifications', async (req, res) => {
  const { farmerId } = req.query;
  if (!farmerId) {
    return res.status(400).json({ success: false, error: 'farmerId is required' });
  }

  if (!db) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  try {
    const notifications = [];
    const now = new Date();

    // 1. Fetch crop warning/aging alerts directly from AppNotification database table
    const dbNotifsRes = await db.query(
      `SELECT id, "lotId", type, title, message, icon, "isRead", "createdAt" 
       FROM "AppNotification" 
       WHERE "userId" = $1 
       ORDER BY "createdAt" DESC`,
      [farmerId]
    );

    dbNotifsRes.rows.forEach(item => {
      const createdAt = new Date(item.createdAt);
      const diffTime = Math.abs(now - createdAt);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;
      let timeLabel = `${diffDays}d ago`;
      if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60)) || 0;
        timeLabel = diffHours > 0 ? `${diffHours}h ago` : 'Just now';
      }

      notifications.push({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type, // 'warning' or 'aging'
        createdAt: item.createdAt,
        isRead: item.isRead,
        timeLabel: timeLabel
      });
    });

    // 2. Fetch pending invoices from BillingEntry dynamically (always real-time)
    const billsRes = await db.query(
      `SELECT id, "invoiceNumber", amount, "paidAmount", status, "dueDate", "createdAt", "periodLabel" 
       FROM "BillingEntry" 
       WHERE "farmerId" = $1 AND status = 'PENDING'`,
      [farmerId]
    );

    billsRes.rows.forEach(bill => {
      const dueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(new Date(bill.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      const diffTime = dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 15) {
        const timeAgoMs = now - new Date(bill.createdAt);
        const timeAgoDays = Math.floor(timeAgoMs / (1000 * 60 * 60 * 24)) || 0;
        let timeLabel = `${timeAgoDays}d ago`;
        if (timeAgoDays === 0) {
          const timeAgoHours = Math.floor(timeAgoMs / (1000 * 60 * 60)) || 0;
          timeLabel = timeAgoHours > 0 ? `${timeAgoHours}h ago` : 'Just now';
        }

        notifications.push({
          id: `bill-${bill.id}`,
          title: 'Payment Due',
          message: `Storage rent of ₹${parseFloat(bill.amount).toLocaleString('en-IN')} is due for ${bill.periodLabel || 'recent storage period'}.`,
          type: 'billing',
          createdAt: bill.createdAt,
          isRead: false,
          timeLabel: timeLabel
        });
      }
    });

    // 3. Sort merged notifications by creation date descending
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('PostgreSQL notifications GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

module.exports = router;
