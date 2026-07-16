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

  test('validateRedeemVoucher behaves identically to apply validator', () => {
    req.body = { voucherCode: 'SAVE50', amount: 100, farmerId: 'F1' };
    validateRedeemVoucher(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
