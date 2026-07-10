const paymentRepository = require('./payment.repository');
const { createAppNotification } = require('../../shared/notifications/notifications');

async function getPaymentDetails(req, res) {
  const { id } = req.params;
  try {
    const details = await paymentRepository.getPaymentDetailsWithFarmerInfo(id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    const { payment, farmer, csName } = details;

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
    console.error('getPaymentDetails error');
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function approvePayment(req, res) {
  console.log('[Payment Controller] approvePayment called');
  const { id } = req.params;

  try {
    const txResult = await paymentRepository.approvePaymentTx(id);

    if (!txResult.success) {
      return res.status(txResult.status || 500).json({ success: false, error: txResult.error });
    }

    const payment = txResult.payment;

    // Send success notification AFTER commit (so rollback won't leave phantom notifications)
    await createAppNotification({
      coldStorageId: payment.coldStorageId, userId: payment.farmerId, lotId: null, type: 'info',
      title: 'Payment Approved',
      message: `Your payment of ₹${parseFloat(payment.amount).toLocaleString('en-IN')} (UTR: ${payment.reference}) has been approved.`,
      icon: 'check', actionUrl: '/khata'
    });

    return res.json({ success: true, message: 'Payment approved successfully' });
  } catch (error) {
    console.error('approvePayment error');
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { getPaymentDetails, approvePayment };
