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
    const resolvedColdStorageId = bodyColdStorageId || dbColdStorageId;
    if (!resolvedColdStorageId) {
      return res.status(400).json({ success: false, error: 'coldStorageId is required.' });
    }
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

  const client = await db.connect();
  try {
    let finalReceiptPath = receiptFile;
    if (receiptFile && receiptFile.startsWith('data:')) {
      try {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const matches = receiptFile.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          let extension = 'png';
          if (matches[1].includes('jpeg') || matches[1].includes('jpg')) extension = 'jpg';
          else if (matches[1].includes('pdf')) extension = 'pdf';
          else if (matches[1].includes('webp')) extension = 'webp';
          const fileName = `receipt_${paymentId}_${Date.now()}.${extension}`;
          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
          const host = req.get('host');
          finalReceiptPath = `${req.protocol}://${host}/uploads/${fileName}`;
        }
      } catch (saveErr) {
        console.error('Failed to save receipt file:', saveErr.message);
      }
    }

    await client.query('BEGIN');

    const paymentRes = await client.query('SELECT * FROM "Payment" WHERE id = $1 FOR UPDATE', [paymentId]);
    if (paymentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentRes.rows[0];
    const { farmerId, coldStorageId, amount } = payment;

    const farmerRes = await client.query('SELECT name FROM "Farmer" WHERE id = $1', [farmerId]);
    const farmerName = farmerRes.rows.length > 0 ? farmerRes.rows[0].name : 'Farmer';

    const utrRegex = /^[A-Z0-9]{12,22}$/i;
    if (!utrRegex.test(utrNumber)) {
      await client.query('ROLLBACK');
      await createAppNotification({
        coldStorageId, userId: farmerId, lotId: null, type: 'warning',
        title: 'Payment Details Incorrect',
        message: `The UTR/Transaction Reference Number "${utrNumber}" you submitted is invalid. Please verify and resubmit.`,
        icon: 'alert-triangle', actionUrl: null
      });
      return res.json({ success: false, preCheckFailed: true, error: 'Invalid UTR format. It must be between 12 and 22 alphanumeric characters.' });
    }

    const duplicateRes = await client.query(
      `SELECT id FROM "Payment" WHERE "reference" = $1 AND "status" NOT IN ('REJECTED', 'CANCELLED') AND id != $2 LIMIT 1`,
      [utrNumber, paymentId]
    );
    if (duplicateRes.rows.length > 0) {
      await client.query('ROLLBACK');
      await createAppNotification({
        coldStorageId, userId: farmerId, lotId: null, type: 'warning',
        title: 'Payment Details Incorrect',
        message: `The UTR "${utrNumber}" has already been submitted for verification. Please verify and resubmit if needed.`,
        icon: 'alert-triangle', actionUrl: null
      });
      return res.json({ success: false, preCheckFailed: true, error: 'Duplicate UTR. This transaction reference has already been used.' });
    }

    const parsedDate = paymentDate ? new Date(paymentDate) : new Date();
    await client.query(
      `UPDATE "Payment" SET "status" = 'PENDING', "reference" = $1, "receiptUrl" = $2, "createdAt" = $3,
       "paymentMode" = COALESCE($5, "paymentMode"), "bankName" = COALESCE($6, "bankName") WHERE id = $4`,
      [utrNumber, finalReceiptPath, parsedDate, paymentId, paymentMode, bankName]
    );

    await client.query('COMMIT');

    await createAppNotification({
      coldStorageId, userId: coldStorageId, lotId: null, type: 'warning',
      title: 'Payment Verification Required',
      message: `Farmer ${farmerName} submitted payment details of ₹${amount.toLocaleString('en-IN')} (UTR: ${utrNumber}) for verification.`,
      icon: 'lock', actionUrl: `/payment-verification/${paymentId}`
    });

    return res.json({ success: true, message: 'Payment verification submitted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('verifyPayment (manual) error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to verify payment' });
  } finally {
    client.release();
  }
}

module.exports = { initiatePayment, verifyManualPayment };
