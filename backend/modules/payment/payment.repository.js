const db = require('../../config/database');

async function getFarmerPendingRent(farmerId) {
  const result = await db.query(
    `SELECT COALESCE(SUM("balanceDueAmount"), 0) AS "pendingRent"
     FROM "NikasiTransaction"
     WHERE "farmerId" = $1`,
    [farmerId]
  );
  return parseFloat(result.rows[0]?.pendingRent || 0);
}

async function createPendingPayment({ orderId, farmerId, amount, note, createdByUserId, coldStorageId }) {
  await db.query(
    `INSERT INTO "Payment" (
      "id", "farmerId", "vendorId", "direction", "status", "amount", 
      "paymentMode", "reference", "note", "createdByUserId", "createdAt", "coldStorageId"
    ) VALUES ($1, $2, NULL, 'INBOUND', 'PENDING', $3, 'UPI', $1, $4, $5, NOW(), $6)`,
    [
      orderId,
      farmerId,
      amount,
      note || 'Online payment via App',
      createdByUserId || 'FARMER_APP',
      coldStorageId || 'cmmp9txv0000ai3t4wush9trs'
    ]
  );
}

async function updatePaymentStatus(orderId, status, paymentId = null) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Get current status and details of the payment
    const payRes = await client.query('SELECT * FROM "Payment" WHERE "id" = $1 FOR UPDATE', [orderId]);
    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }
    
    const payment = payRes.rows[0];
    const oldStatus = payment.status;
    
    // 2. Update the status and reference in the Payment table
    await client.query(
      `UPDATE "Payment"
       SET "status" = $1, "reference" = COALESCE($2, "reference")
       WHERE "id" = $3`,
      [status, paymentId, orderId]
    );

    // 3. If transitioning to PAID from another status, update NikasiTransaction records
    if (status === 'PAID' && oldStatus !== 'PAID') {
      const farmerId = payment.farmerId;
      const amount = parseFloat(payment.amount);

      if (amount > 0) {
        // Fetch all transactions with pending dues for this farmer
        const txRes = await client.query(
          `SELECT id, "balanceDueAmount", "paidAmount" 
           FROM "NikasiTransaction" 
           WHERE "farmerId" = $1 AND "balanceDueAmount" > 0 
           ORDER BY "createdAt" ASC`,
          [farmerId]
        );

        let remainingPaid = amount;
        for (const tx of txRes.rows) {
          if (remainingPaid <= 0) break;
          const balanceDue = parseFloat(tx.balanceDueAmount);
          const paidAmt = parseFloat(tx.paidAmount || 0);
          
          const toPay = Math.min(balanceDue, remainingPaid);
          const newBalanceDue = balanceDue - toPay;
          const newPaidAmount = paidAmt + toPay;

          await client.query(
            `UPDATE "NikasiTransaction" 
             SET "balanceDueAmount" = $1, "paidAmount" = $2, "updatedAt" = NOW() 
             WHERE "id" = $3`,
            [newBalanceDue, newPaidAmount, tx.id]
          );

          remainingPaid -= toPay;
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getPaymentById(id) {
  const result = await db.query('SELECT * FROM "Payment" WHERE "id" = $1 LIMIT 1', [id]);
  return result.rows[0];
}

module.exports = {
  getFarmerPendingRent,
  createPendingPayment,
  updatePaymentStatus,
  getPaymentById
};
