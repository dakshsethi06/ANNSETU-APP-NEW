const { z } = require('zod');

// Schema for the preview/apply step — does NOT commit anything to the DB
const applyVoucherSchema = z.object({
  voucherCode: z.string().trim().min(1, 'Voucher code is required.').max(50, 'Voucher code is too long.'),
  amount: z.number().positive('Amount must be a positive number.'),
  farmerId: z.string().trim().min(1, 'Farmer ID is required.')
});

// Stricter schema for the final redeem step — requires an explicit orderId
// so the redemption can be linked to a specific transaction in the audit log.
// voucherCode max length enforced to prevent oversized inputs reaching the DB.
const redeemVoucherSchema = z.object({
  voucherCode: z.string().trim().min(1, 'Voucher code is required.').max(50, 'Voucher code is too long.'),
  amount: z.number().positive('Amount must be a positive number.'),
  farmerId: z.string().trim().min(1, 'Farmer ID is required.'),
  orderId: z.string().trim().min(1, 'Order ID is required for redemption.').max(100, 'Order ID is too long.')
});

function validateApplyVoucher(req, res, next) {
  const result = applyVoucherSchema.safeParse(req.body);
  if (!result.success) {
    const errorMsg = result.error.issues.map(err => err.message).join(' ');
    return res.status(400).json({
      success: false,
      error: errorMsg
    });
  }
  req.body = result.data;
  next();
}

function validateRedeemVoucher(req, res, next) {
  const result = redeemVoucherSchema.safeParse(req.body);
  if (!result.success) {
    const errorMsg = result.error.issues.map(err => err.message).join(' ');
    return res.status(400).json({
      success: false,
      error: errorMsg
    });
  }
  req.body = result.data;
  next();
}

module.exports = {
  validateApplyVoucher,
  validateRedeemVoucher
};
