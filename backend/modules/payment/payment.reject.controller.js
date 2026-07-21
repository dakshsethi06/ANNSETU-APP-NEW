const db = require('../../config/database');
const { createAppNotification } = require('../../shared/notifications/notifications');

async function rejectPayment(req, res) {
  console.log('[Payment Controller] rejectPayment called for ID:', req.params.id);
  const { id } = req.params;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Lock the payment row
    const paymentCheck = await client.query('SELECT * FROM "Payment" WHERE id = $1 FOR UPDATE', [id]);
    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentCheck.rows[0];
    const { farmerId, coldStorageId, amount, reference } = payment;

    // 1. Update payment status to REJECTED
    await client.query('UPDATE "Payment" SET "status" = \'REJECTED\' WHERE id = $1', [id]);

    // 2. Clean up pending notification
    await client.query(
      `DELETE FROM "AppNotification" WHERE "userId" = $1 AND "title" = 'Payment Verification Required' AND "actionUrl" LIKE $2`,
      [coldStorageId, `%${id}`]
    );

    await client.query('COMMIT');

    // 3. Send rejection notification AFTER commit
    await createAppNotification({
      coldStorageId, userId: farmerId, lotId: null, type: 'warning',
      title: 'Payment Rejected',
      message: `Your payment of ₹${amount.toLocaleString('en-IN')} (UTR: ${reference}) was rejected. Please check and resubmit.`,
      icon: 'x', actionUrl: '/khata'
    });

    return res.json({ success: true, message: 'Payment rejected successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('rejectPayment error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
}

module.exports = { rejectPayment };
