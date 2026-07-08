const db = require('../../config/database');
const { createAppNotification } = require('../../shared/notifications/notifications');

async function getPaymentDetails(req, res) {
  const { id } = req.params;
  try {
    const paymentRes = await db.query('SELECT * FROM "Payment" WHERE id = $1', [id]);
    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentRes.rows[0];

    const farmerRes = await db.query('SELECT name, phone FROM "Farmer" WHERE id = $1', [payment.farmerId]);
    const farmer = farmerRes.rows.length > 0 ? farmerRes.rows[0] : { name: 'Unknown Farmer', phone: '' };

    const csRes = await db.query('SELECT "displayName" FROM "ColdStorageOnboarding" WHERE id = $1', [payment.coldStorageId]);
    const csName = csRes.rows.length > 0 ? csRes.rows[0].displayName : 'Cold Storage';

    return res.json({
      success: true,
      payment: {
        id: payment.id, farmerId: payment.farmerId, farmerName: farmer.name, farmerPhone: farmer.phone,
        coldStorageId: payment.coldStorageId, coldStorageName: csName, amount: payment.amount,
        status: payment.status, paymentMode: payment.paymentMode, reference: payment.reference,
        receiptFile: payment.receiptUrl || payment.note, createdAt: payment.createdAt,
      }
    });
  } catch (error) {
    console.error('getPaymentDetails error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function approvePayment(req, res) {
  console.log('[Payment Controller] approvePayment called for ID:', req.params.id);
  const { id } = req.params;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Lock the payment row to prevent concurrent approval
    const paymentCheck = await client.query('SELECT * FROM "Payment" WHERE id = $1 FOR UPDATE', [id]);
    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentCheck.rows[0];
    const { farmerId, coldStorageId, amount, reference } = payment;

    // 1. Update payment status to APPROVED
    await client.query(
      `UPDATE "Payment" SET "status" = 'APPROVED',
       "bankName" = COALESCE("bankName", 'Verified Bank'),
       "bankTransactionId" = COALESCE("bankTransactionId", $2) WHERE id = $1`,
      [id, reference]
    );

    // 2. Apply payment to outstanding Nikasi transactions (oldest first)
    let remainingAmount = parseFloat(amount);
    const nikasiRes = await client.query(
      `SELECT id, "balanceDueAmount", "paidAmount" FROM "NikasiTransaction"
       WHERE "farmerId" = $1 AND "balanceDueAmount" > 0 ORDER BY "createdAt" ASC`,
      [farmerId]
    );

    for (const bill of nikasiRes.rows) {
      if (remainingAmount <= 0) break;
      const due = parseFloat(bill.balanceDueAmount);
      const paid = parseFloat(bill.paidAmount || 0);

      if (remainingAmount >= due) {
        await client.query(
          `UPDATE "NikasiTransaction" SET "balanceDueAmount" = 0, "paidAmount" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [paid + due, bill.id]
        );
        remainingAmount -= due;
      } else {
        await client.query(
          `UPDATE "NikasiTransaction" SET "balanceDueAmount" = $1, "paidAmount" = $2, "updatedAt" = NOW() WHERE id = $3`,
          [due - remainingAmount, paid + remainingAmount, bill.id]
        );
        remainingAmount = 0;
      }
    }

    // 3. Clean up pending notification
    await client.query(
      `DELETE FROM "AppNotification" WHERE "userId" = $1 AND "title" = 'Payment Verification Required' AND "actionUrl" LIKE $2`,
      [coldStorageId, `%${id}`]
    );

    await client.query('COMMIT');

    // 4. Send success notification AFTER commit (so rollback won't leave phantom notifications)
    await createAppNotification({
      coldStorageId, userId: farmerId, lotId: null, type: 'info',
      title: 'Payment Approved',
      message: `Your payment of ₹${amount.toLocaleString('en-IN')} (UTR: ${reference}) has been approved.`,
      icon: 'check', actionUrl: '/khata'
    });

    return res.json({ success: true, message: 'Payment approved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('approvePayment error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
}

module.exports = { getPaymentDetails, approvePayment };
