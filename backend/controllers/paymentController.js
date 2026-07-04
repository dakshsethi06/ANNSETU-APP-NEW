const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const paymentRepository = require('../repositories/paymentRepository');
const { createAppNotification } = require('../lib/notifications');

// Fetch credentials from env, with fallbacks for local test/mock runs
const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_DakshSethi123';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_daksh_sethi';

let razorpayInstance = null;
try {
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
} catch (e) {
  console.warn('Razorpay client initialization warning:', e.message);
}

async function createOrder(req, res) {
  const { farmerId } = req.body;
  if (!farmerId) {
    return res.status(400).json({ success: false, error: 'farmerId is required.' });
  }

  try {
    // 1. Compute price server-side (client never sends a price)
    const pendingRent = await paymentRepository.getFarmerPendingRent(farmerId);
    if (pendingRent <= 0) {
      return res.status(400).json({ success: false, error: 'No pending rent balance to pay.' });
    }

    const amountPaise = Math.round(pendingRent * 100);
    const receipt = `rcpt_${farmerId}_${Date.now().toString().slice(-6)}`;

    let orderId;
    let paymentLinkUrl;
    let serverIp = req.headers.host || '10.36.66.6:3001';
    if (serverIp.includes('localhost') || serverIp.includes('127.0.0.1')) {
      serverIp = '10.36.66.6:3001';
    }
    const isMockMode = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'mock_secret_daksh_sethi';

    if (isMockMode) {
      orderId = `order_mock_${Math.random().toString(36).substr(2, 9)}`;
      paymentLinkUrl = `http://${serverIp}/api/payments/mock-checkout/${orderId}`;
    } else {
      const order = await razorpayInstance.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: receipt,
      });
      orderId = order.id;

      // Create a real Razorpay Hosted Payment Link
      try {
        let serverIp = req.headers.host || '10.36.66.6:3001';
        if (serverIp.includes('localhost') || serverIp.includes('127.0.0.1')) {
          serverIp = '10.36.66.6:3001';
        }
        const callbackUrl = `http://${serverIp}/api/payments/success`;

        const link = await razorpayInstance.paymentLink.create({
          amount: amountPaise,
          currency: 'INR',
          accept_partial: false,
          description: `Rent payment for Farmer account ${farmerId}`,
          customer: {
            name: 'Farmer Partner',
            email: `farmer_${farmerId}@annsetu.local`,
            contact: farmerId.length === 10 ? farmerId : '9999999999'
          },
          notify: { sms: false, email: false },
          reminder_enable: false,
          notes: { order_id: orderId },
          callback_url: callbackUrl,
          callback_method: 'get',
          reference_id: orderId
        });
        paymentLinkUrl = link.short_url;
      } catch (linkErr) {
        console.warn('Razorpay payment link creation failed:', linkErr.message);
        // Fallback standard checkout page
        paymentLinkUrl = `https://checkout.razorpay.com/v1/checkout.html?key=${keyId}&amount=${amountPaise}&order_id=${orderId}`;
      }
    }

    // 2. Insert payment = CREATED/PENDING in PostgreSQL
    await paymentRepository.createPendingPayment({
      orderId: orderId,
      farmerId: farmerId,
      amount: pendingRent,
      note: `Online Rent Payment via App for account ${farmerId}`
    });

    return res.json({
      success: true,
      order_id: orderId,
      key_id: keyId,
      amount: pendingRent,
      currency: 'INR',
      payment_link_url: paymentLinkUrl
    });
  } catch (error) {
    console.error('Razorpay createOrder error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create payment order.' });
  }
}

async function initiatePayment(req, res) {
  console.log('[Payment Controller] initiatePayment called with body:', req.body);
  const { farmerId, amount, paymentMode, coldStorageId: bodyColdStorageId } = req.body;
  if (!farmerId || !amount) {
    return res.status(400).json({ success: false, error: 'farmerId and amount are required' });
  }

  try {
    // 1. Get farmer details to retrieve coldStorageId
    const farmerRes = await db.query('SELECT name, "coldStorageId" FROM "Farmer" WHERE id = $1', [farmerId]);
    if (farmerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Farmer profile not found' });
    }

    const { name: farmerName, coldStorageId: dbColdStorageId } = farmerRes.rows[0];
    const resolvedColdStorageId = bodyColdStorageId || dbColdStorageId || 'cmmp9txv0000ai3t4wush9trs';

    // 2. Generate unique payment id
    const paymentId = 'PAY-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);

    // 3. Insert initiated payment record
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

async function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId, utrNumber, receiptFile, paymentDate } = req.body;

  // Case A: Manual/Offline Payment Verification
  if (utrNumber && paymentId) {
    console.log('[Payment Controller] verifyPayment (manual) called for ID:', paymentId, 'UTR:', utrNumber);
    try {
      let finalReceiptPath = receiptFile;
      if (receiptFile && receiptFile.startsWith('data:')) {
        try {
          const uploadDir = path.join(__dirname, '..', 'uploads');
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

      // 1. Fetch the payment record
      const paymentRes = await db.query('SELECT * FROM "Payment" WHERE id = $1', [paymentId]);
      if (paymentRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Payment record not found' });
      }
      const payment = paymentRes.rows[0];
      const { farmerId, coldStorageId, amount } = payment;

      // Fetch farmer profile
      const farmerRes = await db.query('SELECT name FROM "Farmer" WHERE id = $1', [farmerId]);
      const farmerName = farmerRes.rows.length > 0 ? farmerRes.rows[0].name : 'Farmer';

      // 2. Backend Pre-checks:
      // A. Validate UTR format (between 12 and 22 alphanumeric characters)
      const utrRegex = /^[A-Z0-9]{12,22}$/i;
      if (!utrRegex.test(utrNumber)) {
        // Validation failed! Send notification to farmer
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

      // B. Check for duplicate UTR (excluding rejected or cancelled records)
      const duplicateRes = await db.query(
        `SELECT id FROM "Payment" 
         WHERE "reference" = $1 AND "status" NOT IN ('REJECTED', 'CANCELLED') AND id != $2 
         LIMIT 1`,
        [utrNumber, paymentId]
      );

      if (duplicateRes.rows.length > 0) {
        // Duplicate UTR validation failed! Send notification to farmer
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

      // 3. Pre-checks passed! Update status, reference, note, and createdAt date
      const parsedDate = paymentDate ? new Date(paymentDate) : new Date();
      await db.query(
        `UPDATE "Payment"
         SET "status" = 'PENDING', "reference" = $1, "note" = $2, "createdAt" = $3
         WHERE id = $4`,
        [utrNumber, finalReceiptPath, parsedDate, paymentId]
      );

      // Send notification to cold storage
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

  // Case B: Online Razorpay Verification
  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ success: false, error: 'Missing required verification parameters.' });
  }

  try {
    let isValid = false;
    const isMock = razorpay_order_id.startsWith('order_mock_') || razorpay_signature === 'mock_signature';

    if (isMock) {
      isValid = true;
    } else {
      if (!razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Missing razorpay_signature.' });
      }
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');
      isValid = generatedSignature === razorpay_signature;
    }

    if (!isValid) {
      await paymentRepository.updatePaymentStatus(razorpay_order_id, 'CANCELLED');
      return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
    }

    // 3. Update status = PAID
    await paymentRepository.updatePaymentStatus(razorpay_order_id, 'PAID', razorpay_payment_id);

    // 4. Trigger JIT notification
    try {
      const payment = await paymentRepository.getPaymentById(razorpay_order_id);
      if (payment) {
        await createAppNotification({
          coldStorageId: payment.coldStorageId,
          userId: payment.farmerId,
          type: 'billing',
          title: 'Payment Successful',
          message: `Your payment of ₹${payment.amount} has been successfully processed. Thank you!`,
          icon: 'dollar-sign'
        });
      }
    } catch (err) {
      console.warn('Failed to send payment confirmation notification:', err.message);
    }

    return res.json({ success: true, message: 'Payment verified and captured.' });
  } catch (error) {
    console.error('Razorpay verifyPayment error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to verify payment.' });
  }
}

async function handleWebhook(req, res) {
  const signatureHeader = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_daksh_sethi';

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const skipVerify = webhookSecret === 'webhook_secret_daksh_sethi';
    if (!skipVerify && expectedSignature !== signatureHeader) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const entity = req.body.payload.payment.entity;
      const orderId = entity.order_id;
      const paymentId = entity.id;

      if (orderId) {
        await paymentRepository.updatePaymentStatus(orderId, 'PAID', paymentId);
      }
    } else if (event === 'payment.failed') {
      const entity = req.body.payload.payment.entity;
      const orderId = entity.order_id;

      if (orderId) {
        await paymentRepository.updatePaymentStatus(orderId, 'CANCELLED');
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function renderMockCheckout(req, res) {
  const { orderId } = req.params;
  
  let amount = 0.00;
  try {
    const paymentRes = await db.query('SELECT amount FROM "Payment" WHERE id = $1', [orderId]);
    if (paymentRes.rows.length > 0) {
      amount = paymentRes.rows[0].amount;
    }
  } catch (err) {
    console.warn('Failed to retrieve order amount for mock checkout:', err.message);
  }

  res.send(`
    <html>
      <head>
        <title>AnnSetu Mock Payment Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #FAF7F0;
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          .card {
            background: white;
            padding: 32px;
            border-radius: 24px;
            box-shadow: 0 10px 25px rgba(30, 64, 50, 0.08);
            text-align: center;
            max-width: 420px;
            width: 100%;
            border: 1px solid #E8E0CE;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #1E5C2E;
            margin-bottom: 24px;
            letter-spacing: -0.5px;
          }
          h2 {
            color: #1E4032;
            margin-top: 0;
            font-size: 22px;
            font-weight: 800;
          }
          p {
            color: #71717A;
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .amount-box {
            background: #F3EFE3;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 24px;
            border: 1px solid #EAD9B0;
          }
          .amount-label {
            font-size: 12px;
            text-transform: uppercase;
            color: #71717A;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .amount-value {
            font-size: 32px;
            font-weight: 800;
            color: #1A1A1A;
          }
          .btn-pay {
            display: block;
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 28px;
            font-weight: 800;
            font-size: 15px;
            cursor: pointer;
            background: #1E5C2E;
            color: white;
            transition: background 0.2s;
            margin-bottom: 12px;
          }
          .btn-pay:hover {
            background: #164622;
          }
          .btn-cancel {
            display: block;
            width: 100%;
            padding: 14px;
            border: 1px solid #E4E4E7;
            border-radius: 28px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            background: white;
            color: #71717A;
            text-decoration: none;
            text-align: center;
            box-sizing: border-box;
          }
          .btn-cancel:hover {
            background: #F8F9FA;
            color: #1A1A1A;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">AnnSetu Gateway</div>
          <h2>Mock Payment Checkout</h2>
          <p>You are in test mode. Click below to simulate a successful Razorpay transaction payment capture.</p>
          <div class="amount-box">
            <div class="amount-label">Total Amount</div>
            <div class="amount-value">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <form id="payForm" method="POST" action="/api/payments/verify">
            <input type="hidden" name="razorpay_order_id" value="${orderId}">
            <input type="hidden" name="razorpay_payment_id" value="pay_mock_${Math.random().toString(36).substr(2, 9)}">
            <input type="hidden" name="razorpay_signature" value="mock_signature">
            <button type="submit" class="btn-pay">Pay Now (Simulate Success)</button>
          </form>
          <a href="#" class="btn-cancel" onclick="window.close()">Cancel Payment</a>
        </div>
        <script>
          const form = document.getElementById('payForm');
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new URLSearchParams(new FormData(form));
            try {
              const res = await fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
              });
              const data = await res.json();
              if (data.success) {
                window.location.href = '/api/payments/success?order_id=${orderId}&payment_id=' + form.razorpay_payment_id.value;
              } else {
                alert('Payment verification failed: ' + data.error);
              }
            } catch (err) {
              alert('Error verifying payment: ' + err.message);
            }
          });
        </script>
      </body>
    </html>
  `);
}

async function renderSuccessPage(req, res) {
  const { 
    order_id, 
    payment_id,
    razorpay_payment_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status 
  } = req.query;

  const finalPaymentId = payment_id || razorpay_payment_id || 'pay_mock_' + Math.random().toString(36).substr(2, 9);
  const finalOrderId = order_id || razorpay_payment_link_reference_id;
  const isPaid = razorpay_payment_link_status === 'paid' || (!razorpay_payment_link_status && payment_id);

  if (isPaid && finalOrderId) {
    try {
      await paymentRepository.updatePaymentStatus(finalOrderId, 'PAID', finalPaymentId);
    } catch (err) {
      console.error('Failed to update status on success redirect:', err.message);
    }
  }

  res.send(`
    <html>
      <head>
        <title>Payment Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, sans-serif; background: #FAF7F0; margin: 0; padding: 20px; display: flex; align-items: center; justify-content: center; height: 100vh; }
          .card { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%; border: 1px solid #E8E0CE; }
          .icon { width: 72px; height: 72px; background: #16A34A; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: white; font-size: 36px; font-weight: bold; }
          h2 { color: #1B4332; margin-top: 0; font-size: 22px; font-weight: 800; }
          p { color: #71717A; font-size: 14px; margin-bottom: 24px; }
          .receipt { text-align: left; background: #EAE7D6; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #E8E0CE; }
          .receipt-row { display: flex; justify-content: space-between; font-size: 13px; color: #1B4332; padding: 6px 0; border-bottom: 1px solid rgba(27, 67, 50, 0.05); }
          .receipt-row:last-child { border-bottom: none; }
          .label { color: #71717A; }
          .val { font-weight: bold; }
          .btn-done { display: block; width: 100%; padding: 12px; border: none; border-radius: 24px; font-weight: bold; font-size: 14px; cursor: pointer; background: #1E5C2E; color: white; text-decoration: none; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h2>Payment Successful!</h2>
          <p>Your payment has been successfully processed and verified.</p>
          <div class="receipt">
            <div class="receipt-row">
              <span class="label">Order ID</span>
              <span class="val">${finalOrderId || ''}</span>
            </div>
            <div class="receipt-row">
              <span class="label">Payment ID</span>
              <span class="val">${finalPaymentId || ''}</span>
            </div>
          </div>
          <button class="btn-done" onclick="window.close()">Return to App</button>
        </div>
      </body>
    </html>
  `);
}

async function getPaymentDetails(req, res) {
  const { id } = req.params;
  try {
    const paymentRes = await db.query('SELECT * FROM "Payment" WHERE id = $1', [id]);
    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentRes.rows[0];

    // Fetch farmer details
    const farmerRes = await db.query('SELECT name, phone FROM "Farmer" WHERE id = $1', [payment.farmerId]);
    const farmer = farmerRes.rows.length > 0 ? farmerRes.rows[0] : { name: 'Unknown Farmer', phone: '' };

    // Fetch cold storage name
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
    // Get payment details
    const paymentCheck = await db.query('SELECT * FROM "Payment" WHERE id = $1', [id]);
    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentCheck.rows[0];
    const { farmerId, coldStorageId, amount, reference } = payment;

    // Update payment status to APPROVED
    await db.query('UPDATE "Payment" SET "status" = \'APPROVED\' WHERE id = $1', [id]);

    // Apply the payment amount to the farmer's outstanding Nikasi transactions (oldest first)
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
        // Fully pay this transaction
        await db.query(
          `UPDATE "NikasiTransaction" 
           SET "balanceDueAmount" = 0, "paidAmount" = $1, "updatedAt" = NOW() 
           WHERE id = $2`,
          [paid + due, bill.id]
        );
        remainingAmount -= due;
      } else {
        // Partially pay this transaction
        await db.query(
          `UPDATE "NikasiTransaction" 
           SET "balanceDueAmount" = $1, "paidAmount" = $2, "updatedAt" = NOW() 
           WHERE id = $3`,
          [due - remainingAmount, paid + remainingAmount, bill.id]
        );
        remainingAmount = 0;
      }
    }

    // Delete the pending notification for the cold storage
    try {
      await db.query(
        `DELETE FROM "AppNotification" 
         WHERE "userId" = $1 AND "title" = 'Payment Verification Required' AND "actionUrl" LIKE $2`,
        [coldStorageId, `%${id}`]
      );
    } catch (cleanErr) {
      console.warn('Failed to delete pending CS payment notification:', cleanErr.message);
    }

    // Send success notification to farmer
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
    // Get payment details
    const paymentCheck = await db.query('SELECT * FROM "Payment" WHERE id = $1', [id]);
    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const payment = paymentCheck.rows[0];
    const { farmerId, coldStorageId, amount, reference } = payment;

    // Update payment status to REJECTED
    await db.query('UPDATE "Payment" SET "status" = \'REJECTED\' WHERE id = $1', [id]);

    // Delete the pending notification for the cold storage
    try {
      await db.query(
        `DELETE FROM "AppNotification" 
         WHERE "userId" = $1 AND "title" = 'Payment Verification Required' AND "actionUrl" LIKE $2`,
        [coldStorageId, `%${id}`]
      );
    } catch (cleanErr) {
      console.warn('Failed to delete pending CS payment notification:', cleanErr.message);
    }

    // Send failure notification to farmer
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
  createOrder,
  initiatePayment,
  verifyPayment,
  handleWebhook,
  renderMockCheckout,
  renderSuccessPage,
  getPaymentDetails,
  approvePayment,
  rejectPayment
};
