const express = require('express');
const router = express.Router();
const voucherController = require('./voucher.controller');
const { validateApplyVoucher, validateRedeemVoucher } = require('./voucher.validator');
const idempotencyMiddleware = require('../../shared/middleware/idempotency.middleware');

router.post('/vouchers/apply', validateApplyVoucher, voucherController.applyVoucher);
router.post('/vouchers/redeem', idempotencyMiddleware, validateRedeemVoucher, voucherController.redeemVoucher);

module.exports = router;
