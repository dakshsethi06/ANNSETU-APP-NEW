const { validateApplyVoucher, validateRedeemVoucher } = require('../voucher.validator');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Voucher Validator Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = mockRes();
    next = jest.fn();
  });

  // ─── validateApplyVoucher ────────────────────────────────────────────────────

  test('should pass validation for apply with correct payload', () => {
    req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1' };
    validateApplyVoucher(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should fail validation if voucherCode is missing', () => {
    req.body = { amount: 100, farmerId: 'F1' };
    validateApplyVoucher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail validation if amount is 0 or negative', () => {
    req.body = { voucherCode: 'SAVE50', amount: -50, farmerId: 'F1' };
    validateApplyVoucher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail validation if farmerId is missing', () => {
    req.body = { voucherCode: 'SAVE50', amount: 100 };
    validateApplyVoucher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail apply validation if voucherCode exceeds max length', () => {
    req.body = { voucherCode: 'A'.repeat(51), amount: 100, farmerId: 'F1' };
    validateApplyVoucher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ─── validateRedeemVoucher ───────────────────────────────────────────────────
  // NOTE: redeemVoucher has a STRICTER schema than applyVoucher.
  // It requires an additional orderId field to link the redemption
  // to a specific checkout session in the audit log.

  test('should pass validateRedeemVoucher with a complete payload including orderId', () => {
    req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1', orderId: 'order_abc123' };
    validateRedeemVoucher(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should fail validateRedeemVoucher if orderId is missing', () => {
    // This was the stale assumption — redeem without orderId must now be rejected.
    // When a required field is completely absent, Zod emits its default "Required" message.
    req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1' };
    validateRedeemVoucher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail validateRedeemVoucher if orderId is an empty string', () => {
    req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1', orderId: '   ' };
    validateRedeemVoucher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail validateRedeemVoucher if voucherCode exceeds max length', () => {
    req.body = { voucherCode: 'A'.repeat(51), amount: 100, farmerId: 'F1', orderId: 'order_abc123' };
    validateRedeemVoucher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail validateRedeemVoucher if orderId exceeds max length', () => {
    req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1', orderId: 'X'.repeat(101) };
    validateRedeemVoucher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

