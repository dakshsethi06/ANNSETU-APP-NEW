const paymentRepository = require('./payment.repository');
const razorpayService = require('./razorpay.service');

async function createOrder(req, res) {
  const { farmerId, amount } = req.body;
  if (!farmerId) {
    return res.status(400).json({ success: false, error: 'farmerId is required.' });
  }

  try {
    let finalAmount = amount ? parseFloat(amount) : 0;
    if (!finalAmount) {
      finalAmount = await paymentRepository.getFarmerPendingRent(farmerId);
    }
    if (finalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'No pending rent balance to pay.' });
    }

    const amountPaise = Math.round(finalAmount * 100);
    const receipt = `rcpt_${farmerId}_${Date.now().toString().slice(-6)}`;

    let serverIp = req.headers.host || '192.168.200.24:3001';
    if (serverIp.includes('localhost') || serverIp.includes('127.0.0.1')) {
      serverIp = '192.168.200.24:3001';
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
            name: 'Farmer Partner',
            email: `farmer_${farmerId}@annsetu.local`,
            contact: farmerId.length === 10 ? farmerId : '9999999999'
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
      note: `Online Rent Payment via App for account ${farmerId}`
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
