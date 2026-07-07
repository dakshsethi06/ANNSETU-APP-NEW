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

function extractBankNameAndTransactionId(payDetails) {
  let bankName = 'UPI Provider';
  let bankTransactionId = payDetails.id;

  if (payDetails.acquirer_data) {
    bankTransactionId = payDetails.acquirer_data.bank_transaction_id || payDetails.acquirer_data.rrn || payDetails.id;
  }

  const method = (payDetails.method || 'upi').toLowerCase();

  if (method === 'netbanking' && payDetails.bank) {
    const bankCode = payDetails.bank.toUpperCase();
    const bankMap = {
      'HDFC': 'HDFC Bank',
      'ICIC': 'ICICI Bank',
      'SBIN': 'State Bank of India',
      'UTIB': 'Axis Bank',
      'PUNB': 'Punjab National Bank',
      'BARB': 'Bank of Baroda',
      'CNRB': 'Canara Bank',
      'IBKL': 'IDBI Bank',
      'YESB': 'Yes Bank',
      'KKBK': 'Kotak Mahindra Bank'
    };
    bankName = bankMap[bankCode] || `${bankCode} Netbanking`;
  } else if (method === 'card' && payDetails.card) {
    bankName = payDetails.card.issuer || 'Card Issuer Bank';
  } else if (method === 'upi' && payDetails.vpa) {
    const vpa = payDetails.vpa.toLowerCase();
    if (vpa.includes('okaxis') || vpa.includes('axis')) bankName = 'Axis Bank';
    else if (vpa.includes('okhdfc') || vpa.includes('hdfc')) bankName = 'HDFC Bank';
    else if (vpa.includes('okicici') || vpa.includes('icici')) bankName = 'ICICI Bank';
    else if (vpa.includes('oksbi') || vpa.includes('sbi')) bankName = 'State Bank of India';
    else if (vpa.includes('okpostbaroda') || vpa.includes('baroda')) bankName = 'Bank of Baroda';
    else if (vpa.includes('paytm')) bankName = 'Paytm Payments Bank';
    else if (vpa.includes('ybl') || vpa.includes('ibl')) bankName = 'Yes Bank';
  }

  return { bankName, bankTransactionId };
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
