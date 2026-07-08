const farmerRepository = require('../farmer/farmer.repository');
const paymentRepository = require('./payment.repository');
const razorpayService = require('./razorpay.service');

async function createOrder(req, res) {
  console.log('[Create Order API] Incoming body:', req.body);
  const { farmerId, amount } = req.body;

  try {
    let farmerName = 'Farmer Partner';
    let farmerPhone = '9876543210';
    let resolvedColdStorageId = null;
    try {
      const farmer = await farmerRepository.getFarmerBasicDetails(farmerId);
      if (farmer) {
        if (farmer.name) {
          farmerName = farmer.name;
        }
        if (farmer.phone) {
          const rawPhone = farmer.phone.replace(/\D/g, '');
          if (rawPhone.length === 10 && !/^(.)\1+$/.test(rawPhone)) {
            farmerPhone = rawPhone;
          }
        }
        resolvedColdStorageId = farmer.coldStorageId;
      }
    } catch (dbErr) {
      console.warn('Failed to fetch farmer profile for payment checkout:', dbErr.message);
    }

    if (!resolvedColdStorageId) {
      return res.status(400).json({ success: false, error: 'coldStorageId is required.' });
    }

    let finalAmount = amount ? parseFloat(amount) : 0;
    console.log('[Create Order API] parsed amount:', amount, '-> finalAmount:', finalAmount);
    if (!finalAmount) {
      finalAmount = await paymentRepository.getFarmerPendingRent(farmerId);
      console.log('[Create Order API] fallback to pending rent:', finalAmount);
    }
    
    // Capping logic check: if partial payment amount is greater than pending dues, cap it to pending dues
    const pendingDues = await paymentRepository.getFarmerPendingRent(farmerId);
    console.log('[Create Order API] farmer pendingDues:', pendingDues);
    if (finalAmount > pendingDues) {
      console.log('[Create Order API] Capping payment amount from:', finalAmount, 'to pendingDues:', pendingDues);
      finalAmount = pendingDues;
    }

    if (finalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'No pending rent balance to pay.' });
    }

    const amountPaise = Math.round(finalAmount * 100);
    const receipt = `rcpt_${farmerId}_${Date.now().toString().slice(-6)}`;

    let serverIp = req.headers.host || 'localhost:3001';
    if (serverIp.includes('localhost') || serverIp.includes('127.0.0.1')) {
      serverIp = process.env.BACKEND_HOST || serverIp;
    }

    const isMock = razorpayService.isMockMode();
    let orderId;
    let paymentLinkUrl;

    if (isMock) {
      const order = await razorpayService.createOrder(amountPaise, receipt);
      orderId = order.id;
      paymentLinkUrl = `http://${serverIp}/api/payments/mock-checkout/${orderId}`;
    } else {
      try {
        const order = await razorpayService.createOrder(amountPaise, receipt);
        orderId = order.id;

        const callbackUrl = `http://${serverIp}/api/payments/success`;
        const link = await razorpayService.createPaymentLink({
          amountPaise: amountPaise,
          description: `Rent payment for Farmer account ${farmerId}`,
          customer: {
            name: farmerName,
            email: `farmer_${farmerId}@annsetu.local`,
            contact: farmerPhone
          },
          callbackUrl: callbackUrl,
          orderId: orderId
        });

        paymentLinkUrl = link ? link.short_url : `http://${serverIp}/api/payments/mock-checkout/${orderId}`;
      } catch (err) {
        console.warn('Real Razorpay order/link generation failed, falling back to mock:', err.message);
        const mockOrder = await razorpayService.createOrder(amountPaise, receipt);
        orderId = mockOrder.id;
        paymentLinkUrl = `http://${serverIp}/api/payments/mock-checkout/${orderId}`;
      }
    }

    // inserts pending checkout in postgre sql
    await paymentRepository.createPendingPayment({
      orderId: orderId,
      farmerId: farmerId,
      amount: finalAmount,
      note: `Online Rent Payment via App for account ${farmerId}`,
      coldStorageId: resolvedColdStorageId
    });

    return res.json({
      success: true,
      order_id: orderId,
      key_id: razorpayService.keyId,
      amount: finalAmount,
      currency: 'INR',
      payment_link_url: paymentLinkUrl
    });
  } catch (error) {
    console.error('Razorpay createOrder error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create payment order.' });
  }
}

module.exports = createOrder;
