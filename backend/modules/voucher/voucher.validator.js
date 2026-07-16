const { z } = require('zod');

const applyVoucherSchema = z.object({
  voucherCode: z.string().trim().min(1, 'Voucher code is required.'),
  amount: z.number().positive('Amount must be a positive number.'),
  farmerId: z.string().trim().min(1, 'Farmer ID is required.')
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

module.exports = {
  validateApplyVoucher,
  validateRedeemVoucher: validateApplyVoucher
};
