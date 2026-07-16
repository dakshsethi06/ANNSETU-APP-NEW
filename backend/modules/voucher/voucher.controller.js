const db = require('../../config/database');
const voucherService = require('./voucher.service');
const farmerRepository = require('../farmer/farmer.repository');

async function applyVoucher(req, res) {
  const { voucherCode, amount, farmerId } = req.body;

  try {
    const farmer = await farmerRepository.getFarmerBasicDetails(farmerId);
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer not found.' });
    }

    const result = await voucherService.validateAndCalculateDiscount(
      voucherCode,
      farmerId,
      amount,
      farmer.coldStorageId
    );

    return res.json({
      success: true,
      voucherCode: result.voucher.code,
      type: result.voucher.type,
      discountAmount: result.discountAmount,
      netAmount: result.netAmount,
      message: `Voucher applied: Rs. ${result.discountAmount} discount calculated.`
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}

async function redeemVoucher(req, res) {
  const { voucherCode, amount, farmerId } = req.body;

  const client = await db.connect();
  try {
    const farmer = await farmerRepository.getFarmerBasicDetails(farmerId);
    if (!farmer) {
      client.release();
      return res.status(404).json({ success: false, error: 'Farmer not found.' });
    }

    // Validate and preview first
    const preview = await voucherService.validateAndCalculateDiscount(
      voucherCode,
      farmerId,
      amount,
      farmer.coldStorageId
    );

    // Enforce that it covers the full amount for direct ₹0 checkouts
    if (preview.netAmount > 0) {
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Voucher does not cover the full payment amount. Please initiate an online payment instead.'
      });
    }

    await client.query('BEGIN');

    // Generate unique payment ID
    const paymentId = 'pay_vchr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    // Redeem the voucher transactionally (locks PromoVoucher, increments usage, inserts PromoVoucherLedger)
    const discountApplied = await voucherService.redeemVoucherTransaction(
      voucherCode,
      farmerId,
      amount,
      paymentId,
      client
    );

    // Fetch all pending dues for this farmer and allocate discount
    const txRes = await client.query(
      `SELECT id, "balanceDueAmount", "paidAmount" 
       FROM "NikasiTransaction" 
       WHERE "farmerId" = $1 AND "balanceDueAmount" > 0 
       ORDER BY "createdAt" ASC FOR UPDATE`,
      [farmerId]
    );

    let remainingDiscount = discountApplied;
    for (const tx of txRes.rows) {
      if (remainingDiscount <= 0) break;
      const balanceDue = parseFloat(tx.balanceDueAmount);
      const paidAmt = parseFloat(tx.paidAmount || 0);

      const toPay = Math.min(balanceDue, remainingDiscount);
      const newBalanceDue = balanceDue - toPay;
      const newPaidAmount = paidAmt + toPay;

      await client.query(
        `UPDATE "NikasiTransaction" 
         SET "balanceDueAmount" = $1, "paidAmount" = $2, "updatedAt" = NOW() 
         WHERE "id" = $3`,
        [newBalanceDue, newPaidAmount, tx.id]
      );

      remainingDiscount -= toPay;
    }

    // Insert completed Payment record
    await client.query(
      `INSERT INTO "Payment" (
        "id", "farmerId", "vendorId", "direction", "status", "amount", 
        "paymentMode", "reference", "note", "createdByUserId", "createdAt", 
        "coldStorageId", "voucherCode", "discountAmount"
      ) VALUES ($1, $2, NULL, 'INBOUND', 'PAID', 0.00, 'VOUCHER', $3, $4, 'FARMER_APP', NOW(), $5, $6, $7)`,
      [
        paymentId,
        farmerId,
        voucherCode,
        `Rent payment cleared entirely via voucher: ${voucherCode}`,
        farmer.coldStorageId,
        voucherCode,
        discountApplied
      ]
    );

    await client.query('COMMIT');
    client.release();

    return res.json({
      success: true,
      message: 'Voucher redeemed and dues cleared successfully.',
      paymentId: paymentId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  applyVoucher,
  redeemVoucher
};
