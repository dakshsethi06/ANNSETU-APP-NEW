const path = require('path');
const fs = require('fs');
const db = require('../../config/database');
const { createAppNotification } = require('../../shared/notifications/notifications');

async function initiatePayment(req, res) {
  console.log('[Payment Controller] initiatePayment called with body:', req.body);
  const { farmerId, amount, paymentMode, coldStorageId: bodyColdStorageId } = req.body;

  try {
    const farmerRes = await db.query('SELECT name, "coldStorageId" FROM "Farmer" WHERE id = $1', [farmerId]);
    if (farmerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Farmer profile not found' });
    }

    const { name: farmerName, coldStorageId: dbColdStorageId } = farmerRes.rows[0];
    const resolvedColdStorageId = bodyColdStorageId || dbColdStorageId || 'cmmp9txv0000ai3t4wush9trs';
    const paymentId = 'PAY-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);

    const sql = `
      INSERT INTO "Payment" (
        "id", "farmerId", "coldStorageId", "amount", "paymentMode", "direction", "status", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, 'INBOUND', 'INITIATED', NOW())
      RETURNING *
    `;
    const params = [
      paymentId, farmerId, resolvedColdStorageId, parseFloat(amount), paymentMode || 'online'
    ];
    const result = await db.query(sql, params);

    return res.status(201).json({ success: true, payment: result.rows[0] });
  } catch (error) {
    console.error('initiatePayment error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to initiate payment' });
  }
}

async function verifyManualPayment(req, res) {
  const { paymentId, utrNumber, receiptFile, paymentDate, paymentMode, bankName } = req.body;
  console.log('[Payment Controller] verifyPayment (manual) called for ID:', paymentId, 'UTR:', utrNumber);
  
  try {
    let finalReceiptPath = receiptFile;
    if (receiptFile && receiptFile.startsWith('data:')) {
      try {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const matches = receiptFile.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          let extension = 'png';
          if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
            extension = 'jpg';
          } else if (mimeType.includes('pdf')) {
            extension = 'pdf';
          } else if (mimeType.includes('webp')) {
            extension = 'webp';
          }

          const fileName = `receipt_${paymentId}_${Date.now()}.${extension}`;
          const filePath = path.join(uploadDir, fileName);

          fs.writeFileSync(filePath, buffer);

          const host = req.get('host');
          const protocol = req.protocol;
          finalReceiptPath = `${protocol}://${host}/uploads/${fileName}`;
          console.log('[Payment Controller] Saved base64 file to', filePath, 'URL:', finalReceiptPath);
        }
      } catch (saveErr) {
        console.error('Failed to save receipt file:', saveErr.message);
      }
    }

    const paymentRes = await db.query('SELECT * FROM "Payment" WHERE id = $1', [paymentId]);
    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentRes.rows[0];
    const { farmerId, coldStorageId, amount } = payment;

    const farmerRes = await db.query('SELECT name FROM "Farmer" WHERE id = $1', [farmerId]);
    const farmerName = farmerRes.rows.length > 0 ? farmerRes.rows[0].name : 'Farmer';

    const utrRegex = /^[A-Z0-9]{12,22}$/i;
    if (!utrRegex.test(utrNumber)) {
      await createAppNotification({
        coldStorageId: coldStorageId,
        userId: farmerId,
        lotId: null,
        type: 'warning',
        title: 'Payment Details Incorrect',
        message: `The UTR/Transaction Reference Number "${utrNumber}" you submitted is invalid. Please verify and resubmit.`,
        icon: 'alert-triangle',
        actionUrl: null
      });

      return res.json({
        success: false,
        preCheckFailed: true,
        error: 'Invalid UTR format. It must be between 12 and 22 alphanumeric characters.'
      });
    }

    const duplicateRes = await db.query(
      `SELECT id FROM "Payment" 
       WHERE "reference" = $1 AND "status" NOT IN ('REJECTED', 'CANCELLED') AND id != $2 
       LIMIT 1`,
      [utrNumber, paymentId]
    );

    if (duplicateRes.rows.length > 0) {
      await createAppNotification({
        coldStorageId: coldStorageId,
        userId: farmerId,
        lotId: null,
        type: 'warning',
        title: 'Payment Details Incorrect',
        message: `The UTR "${utrNumber}" has already been submitted for verification. Please verify and resubmit if needed.`,
        icon: 'alert-triangle',
        actionUrl: null
      });

      return res.json({
        success: false,
        preCheckFailed: true,
        error: 'Duplicate UTR. This transaction reference has already been used.'
      });
    }

    const parsedDate = paymentDate ? new Date(paymentDate) : new Date();
    await db.query(
      `UPDATE "Payment"
       SET "status" = 'PENDING', 
           "reference" = $1, 
           "note" = $2, 
           "createdAt" = $3,
           "paymentMode" = COALESCE($5, "paymentMode"),
           "bankName" = COALESCE($6, "bankName")
       WHERE id = $4`,
      [utrNumber, finalReceiptPath, parsedDate, paymentId, paymentMode, bankName]
    );

    await createAppNotification({
      coldStorageId: coldStorageId,
      userId: coldStorageId,
      lotId: null,
      type: 'warning',
      title: 'Payment Verification Required',
      message: `Farmer ${farmerName} submitted payment details of ₹${amount.toLocaleString('en-IN')} (UTR: ${utrNumber}) for verification.`,
      icon: 'lock',
      actionUrl: `/payment-verification/${paymentId}`
    });

    return res.json({ success: true, message: 'Payment verification submitted successfully' });
  } catch (error) {
    console.error('verifyPayment (manual) error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to verify payment' });
  }
}

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
        id: payment.id,
        farmerId: payment.farmerId,
        farmerName: farmer.name,
        farmerPhone: farmer.phone,
        coldStorageId: payment.coldStorageId,
        coldStorageName: csName,
        amount: payment.amount,
        status: payment.status,
        paymentMode: payment.paymentMode,
        reference: payment.reference,
        receiptFile: payment.note,
        createdAt: payment.createdAt,
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
  try {
    const paymentCheck = await db.query('SELECT * FROM "Payment" WHERE id = $1', [id]);
    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentCheck.rows[0];
    const { farmerId, coldStorageId, amount, reference } = payment;

    await db.query(
      `UPDATE "Payment"
       SET "status" = 'APPROVED',
           "bankName" = COALESCE("bankName", 'Verified Bank'),
           "bankTransactionId" = COALESCE("bankTransactionId", $2)
       WHERE id = $1`,
      [id, reference]
    );

    let remainingAmount = parseFloat(amount);
    const nikasiRes = await db.query(
      `SELECT id, "balanceDueAmount", "paidAmount" 
       FROM "NikasiTransaction" 
       WHERE "farmerId" = $1 AND "balanceDueAmount" > 0 
       ORDER BY "createdAt" ASC`,
      [farmerId]
    );

    for (const bill of nikasiRes.rows) {
      if (remainingAmount <= 0) break;
      const due = parseFloat(bill.balanceDueAmount);
      const paid = parseFloat(bill.paidAmount || 0);

      if (remainingAmount >= due) {
        await db.query(
          `UPDATE "NikasiTransaction" 
           SET "balanceDueAmount" = 0, "paidAmount" = $1, "updatedAt" = NOW() 
           WHERE id = $2`,
          [paid + due, bill.id]
        );
        remainingAmount -= due;
      } else {
        await db.query(
          `UPDATE "NikasiTransaction" 
           SET "balanceDueAmount" = $1, "paidAmount" = $2, "updatedAt" = NOW() 
           WHERE id = $3`,
          [due - remainingAmount, paid + remainingAmount, bill.id]
        );
        remainingAmount = 0;
      }
    }

    try {
      await db.query(
        `DELETE FROM "AppNotification" 
         WHERE "userId" = $1 AND "title" = 'Payment Verification Required' AND "actionUrl" LIKE $2`,
        [coldStorageId, `%${id}`]
      );
    } catch (cleanErr) {
      console.warn('Failed to delete pending CS payment notification:', cleanErr.message);
    }

    await createAppNotification({
      coldStorageId: coldStorageId,
      userId: farmerId,
      lotId: null,
      type: 'info',
      title: 'Payment Approved',
      message: `Your payment of ₹${amount.toLocaleString('en-IN')} (UTR: ${reference}) has been approved.`,
      icon: 'check',
      actionUrl: '/khata'
    });

    return res.json({ success: true, message: 'Payment approved successfully' });
  } catch (error) {
    console.error('approvePayment error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function rejectPayment(req, res) {
  console.log('[Payment Controller] rejectPayment called for ID:', req.params.id);
  const { id } = req.params;
  try {
    const paymentCheck = await db.query('SELECT * FROM "Payment" WHERE id = $1', [id]);
    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentCheck.rows[0];
    const { farmerId, coldStorageId, amount, reference } = payment;

    await db.query('UPDATE "Payment" SET "status" = \'REJECTED\' WHERE id = $1', [id]);

    try {
      await db.query(
        `DELETE FROM "AppNotification" 
         WHERE "userId" = $1 AND "title" = 'Payment Verification Required' AND "actionUrl" LIKE $2`,
        [coldStorageId, `%${id}`]
      );
    } catch (cleanErr) {
      console.warn('Failed to delete pending CS payment notification:', cleanErr.message);
    }

    await createAppNotification({
      coldStorageId: coldStorageId,
      userId: farmerId,
      lotId: null,
      type: 'warning',
      title: 'Payment Rejected',
      message: `Your payment of ₹${amount.toLocaleString('en-IN')} (UTR: ${reference}) was rejected. Please check and resubmit.`,
      icon: 'x',
      actionUrl: '/khata'
    });

    return res.json({ success: true, message: 'Payment rejected successfully' });
  } catch (error) {
    console.error('rejectPayment error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  initiatePayment,
  verifyManualPayment,
  getPaymentDetails,
  approvePayment,
  rejectPayment
};
