const path = require('path');
const fs = require('fs');
const paymentRepository = require('./payment.repository');
const paymentConstants = require('./payment.constants');
const farmerRepository = require('../farmer/farmer.repository');
const { createAppNotification } = require('../../shared/notifications/notifications');

async function initiatePayment(req, res) {
  console.log('[Payment Controller] initiatePayment called with body:', req.body);
  const { farmerId, amount, paymentMode, coldStorageId: bodyColdStorageId } = req.body;

  try {
    const farmer = await farmerRepository.getFarmerBasicDetails(farmerId);
    if (!farmer) {
      return res.status(404).json({ success: false, error: paymentConstants.ERROR_MESSAGES.FARMER_NOT_FOUND });
    }

    const { name: farmerName, coldStorageId: dbColdStorageId } = farmer;
    const resolvedColdStorageId = bodyColdStorageId || dbColdStorageId;
    if (!resolvedColdStorageId) {
      return res.status(400).json({ success: false, error: 'coldStorageId is required.' });
    }
    const paymentId = 'PAY-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);

    const payment = await paymentRepository.initiateManualPayment(paymentId, farmerId, resolvedColdStorageId, parseFloat(amount), paymentMode || 'online');

    return res.status(201).json({ success: true, payment });
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

    const utrRegex = /^[A-Z0-9]{12,22}$/i;
    if (!utrRegex.test(utrNumber)) {
      const paymentInfo = await paymentRepository.getPaymentById(paymentId);
      if (paymentInfo) {
        await createAppNotification({
          coldStorageId: paymentInfo.coldStorageId, userId: paymentInfo.farmerId, lotId: null, type: 'warning',
          title: 'Payment Details Incorrect',
          message: `The UTR/Transaction Reference Number "${utrNumber}" you submitted is invalid. Please verify and resubmit.`,
          icon: 'alert-triangle', actionUrl: null
        });
      }
      return res.json({ success: false, preCheckFailed: true, error: 'Invalid UTR format. It must be between 12 and 22 alphanumeric characters.' });
    }

    const parsedDate = paymentDate ? new Date(paymentDate) : new Date();
    
    const txResult = await paymentRepository.verifyManualPaymentTx(
      paymentId, utrNumber, finalReceiptPath, parsedDate, paymentMode, bankName
    );

    if (!txResult.success) {
      if (txResult.duplicate) {
        await createAppNotification({
          coldStorageId: txResult.payment.coldStorageId, userId: txResult.payment.farmerId, lotId: null, type: 'warning',
          title: 'Payment Details Incorrect',
          message: `The UTR "${utrNumber}" has already been submitted for verification. Please verify and resubmit if needed.`,
          icon: 'alert-triangle', actionUrl: null
        });
        return res.json({ success: false, preCheckFailed: true, error: 'Duplicate UTR. This transaction reference has already been used.' });
      }
      return res.status(txResult.status || 500).json({ success: false, error: txResult.error });
    }

    const payment = txResult.payment;
    const farmer = await farmerRepository.getFarmerBasicDetails(payment.farmerId);
    const farmerName = farmer ? farmer.name : 'Farmer';

    await createAppNotification({
      coldStorageId: payment.coldStorageId, userId: payment.coldStorageId, lotId: null, type: 'warning',
      title: 'Payment Verification Required',
      message: `Farmer ${farmerName} submitted payment details of ₹${parseFloat(payment.amount).toLocaleString('en-IN')} (UTR: ${utrNumber}) for verification.`,
      icon: 'lock', actionUrl: `/payment-verification/${paymentId}`
    });

    return res.json({ success: true, message: 'Payment verification submitted successfully' });
  } catch (error) {
    console.error('verifyPayment (manual) error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to verify payment' });
  }
}

module.exports = { initiatePayment, verifyManualPayment };
