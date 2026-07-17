const db = require('../../config/database');
const { extractBankNameAndTransactionId } = require('./payment.helpers');

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
  if (!coldStorageId) {
    throw new Error('coldStorageId is required for creating a pending payment.');
  }
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
      coldStorageId
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

    let bankName = null;
    let bankTransactionId = null;
    let paymentMode = null;

    if (status === 'PAID' && paymentId) {
      try {
        const razorpayService = require('./razorpay.service');
        const payDetails = await razorpayService.fetchPaymentDetails(paymentId);
        if (payDetails) {
          const parsed = extractBankNameAndTransactionId(payDetails);
          bankName = parsed.bankName;
          bankTransactionId = parsed.bankTransactionId;
          if (payDetails.method) {
            paymentMode = payDetails.method.toUpperCase();
          }
        }
      } catch (err) {
        console.warn('Failed to fetch payment details from Razorpay:', err.message);
      }
    }
    
    // 2. Update the status and reference in the Payment table
    await client.query(
      `UPDATE "Payment"
       SET "status" = $1, 
           "reference" = COALESCE($2, "reference"),
           "bankName" = COALESCE($3, "bankName"),
           "bankTransactionId" = COALESCE($4, "bankTransactionId"),
           "paymentMode" = COALESCE($5, "paymentMode")
       WHERE "id" = $6`,
      [status, paymentId, bankName, bankTransactionId, paymentMode, orderId]
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

async function getPaymentDetailsWithFarmerInfo(id) {
  const paymentRes = await db.query('SELECT * FROM "Payment" WHERE id = $1', [id]);
  if (paymentRes.rows.length === 0) return null;
  const payment = paymentRes.rows[0];

  const farmerRes = await db.query('SELECT name, phone FROM "Farmer" WHERE id = $1', [payment.farmerId]);
  const farmer = farmerRes.rows.length > 0 ? farmerRes.rows[0] : { name: 'Unknown Farmer', phone: '' };

  const csRes = await db.query('SELECT "displayName" FROM "ColdStorageOnboarding" WHERE id = $1', [payment.coldStorageId]);
  const csName = csRes.rows.length > 0 ? csRes.rows[0].displayName : 'Cold Storage';

  return { payment, farmer, csName };
}

async function getPaymentById(id) {
  const paymentRes = await db.query('SELECT * FROM "Payment" WHERE id = $1', [id]);
  return paymentRes.rows.length > 0 ? paymentRes.rows[0] : null;
}

async function initiateManualPayment(paymentId, farmerId, coldStorageId, amount, paymentMode) {
  const result = await db.query(
    `INSERT INTO "Payment" (
      "id", "farmerId", "coldStorageId", "amount", "paymentMode", "direction", "status", "createdAt"
    ) VALUES ($1, $2, $3, $4, $5, 'INBOUND', 'INITIATED', NOW())
    RETURNING *`,
    [paymentId, farmerId, coldStorageId, amount, paymentMode]
  );
  return result.rows[0];
}

async function verifyManualPaymentTx(paymentId, utrNumber, finalReceiptPath, parsedDate, paymentMode, bankName) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const paymentRes = await client.query('SELECT * FROM "Payment" WHERE id = $1 FOR UPDATE', [paymentId]);
    if (paymentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, status: 404, error: 'Payment record not found' };
    }
    const payment = paymentRes.rows[0];

    const duplicateRes = await client.query(
      `SELECT id FROM "Payment" WHERE "reference" = $1 AND "status" NOT IN ('REJECTED', 'CANCELLED') AND id != $2 LIMIT 1`,
      [utrNumber, paymentId]
    );
    if (duplicateRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, duplicate: true, payment };
    }

    await client.query(
      `UPDATE "Payment" SET "status" = 'PENDING', "reference" = $1, "receiptUrl" = $2, "createdAt" = $3,
       "paymentMode" = COALESCE($5, "paymentMode"), "bankName" = COALESCE($6, "bankName") WHERE id = $4`,
      [utrNumber, finalReceiptPath, parsedDate, paymentId, paymentMode, bankName]
    );

    await client.query('COMMIT');
    return { success: true, payment };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function approvePaymentTx(paymentId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const paymentCheck = await client.query('SELECT * FROM "Payment" WHERE id = $1 FOR UPDATE', [paymentId]);
    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Payment record not found', status: 404 };
    }
    const payment = paymentCheck.rows[0];

    await client.query(
      `UPDATE "Payment" SET "status" = 'APPROVED',
       "bankName" = COALESCE("bankName", 'Verified Bank'),
       "bankTransactionId" = COALESCE("bankTransactionId", $2) WHERE id = $1`,
      [paymentId, payment.reference]
    );

    let remainingAmount = parseFloat(payment.amount);
    const nikasiRes = await client.query(
      `SELECT id, "balanceDueAmount", "paidAmount" FROM "NikasiTransaction"
       WHERE "farmerId" = $1 AND "balanceDueAmount" > 0 ORDER BY "createdAt" ASC`,
      [payment.farmerId]
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

    await client.query(
      `DELETE FROM "AppNotification" WHERE "userId" = $1 AND "title" = 'Payment Verification Required' AND "actionUrl" LIKE $2`,
      [payment.coldStorageId, `%${paymentId}`]
    );

    await client.query('COMMIT');
    return { success: true, payment };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getFarmerPendingRent,
  createPendingPayment,
  updatePaymentStatus,
  getPaymentById,
  getPaymentDetailsWithFarmerInfo,
  initiateManualPayment,
  verifyManualPaymentTx,
  approvePaymentTx
};
