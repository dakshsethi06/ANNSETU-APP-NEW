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

    // 1. Query active holdings to check for crop aging (>= 90 days / 3 months)
    const holdingsRes = await db.query(
      `SELECT id, commodity AS crop, packets AS bags, "availablePackets", "amadDate" 
       FROM "AmadLot" 
       WHERE "farmerId" = $1 AND "availablePackets" > 0`,
      [farmerId]
    );

    holdingsRes.rows.forEach(lot => {
      const amadDate = new Date(lot.amadDate);
      const diffTime = Math.abs(now - amadDate);
      const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) || 0;

      // Check if stored for 3 months (90 days) or more
      if (ageDays >= 90) {
        notifications.push({
          id: `age-${lot.id}`,
          title: 'Aging Alert',
          message: `Your stock ${lot.id.substring(0, 8).toUpperCase()} (${lot.crop}, ${lot.availablePackets} bags) has been stored for ${ageDays} days. Please dispatch the crop or arrange sale.`,
          type: 'warning',
          createdAt: lot.amadDate,
          isRead: false,
          timeLabel: `${ageDays}d ago`
        });
      }
    });

    // 2. Query billing entries to check for payment dues (deadline <= 15 days)
    const billsRes = await db.query(
      `SELECT id, "invoiceNumber", amount, "paidAmount", status, "dueDate", "createdAt", "periodLabel" 
       FROM "BillingEntry" 
       WHERE "farmerId" = $1 AND status = 'PENDING'`,
      [farmerId]
    );

    billsRes.rows.forEach(bill => {
      // If dueDate is not specified, assume payment is due 30 days after creation
      const dueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(new Date(bill.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      const diffTime = dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Show alert if deadline is in less than or equal to 15 days (or already overdue)
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

    // Sort by createdAt descending (most recent first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('PostgreSQL notifications GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications from database' });
  }
});

module.exports = router;
