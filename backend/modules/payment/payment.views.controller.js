const fs = require('fs');
const path = require('path');
const db = require('../../config/database');
const paymentRepository = require('./payment.repository');

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

  try {
    const htmlPath = path.join(__dirname, 'templates', 'mockCheckout.html');
    const cssPath = path.join(__dirname, 'templates', 'mockCheckout.css');
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');
    
    html = html.replace('/* CSS_PLACEHOLDER */', css);
    html = html.replace(/{{amount}}/g, amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    html = html.replace(/{{orderId}}/g, orderId);
    html = html.replace(/{{mockPaymentId}}/g, `pay_mock_${Math.random().toString(36).substr(2, 9)}`);
    
    res.send(html);
  } catch (err) {
    console.error('Error rendering mock checkout template:', err.message);
    res.status(500).send('Error rendering page.');
  }
}

async function renderSuccessPage(req, res) {
  console.log('[Payment Success View] Incoming req.query:', req.query);
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
      console.log('[Payment Success View] Redirected successfully, updating database order status to PAID for order:', finalOrderId);
      await paymentRepository.updatePaymentStatus(finalOrderId, 'PAID', finalPaymentId);
    } catch (err) {
      console.error('[Payment Success View] Failed to update status on success redirect:', err.message);
    }
  }

  try {
    const htmlPath = path.join(__dirname, 'templates', 'success.html');
    const cssPath = path.join(__dirname, 'templates', 'success.css');
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');
    
    html = html.replace('/* CSS_PLACEHOLDER */', css);
    html = html.replace(/{{orderId}}/g, finalOrderId || '');
    html = html.replace(/{{paymentId}}/g, finalPaymentId || '');
    
    res.send(html);
  } catch (err) {
    console.error('Error rendering success page template:', err.message);
    res.status(500).send('Error rendering page.');
  }
}

module.exports = {
  renderMockCheckout,
  renderSuccessPage
};
