const {
  validateCreateOrder,
  validateInitiatePayment,
  validateGetPaymentDetails,
} = require('../modules/payment/payment.validator');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('payment validators', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = mockRes();
    next = jest.fn();
  });

  describe('validateCreateOrder', () => {
    test('calls next() when farmerId is present', () => {
      req.body = { farmerId: 'F1' };
      validateCreateOrder(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 400 when farmerId is missing', () => {
      validateCreateOrder(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateInitiatePayment', () => {
    test('calls next() with farmerId and amount', () => {
      req.body = { farmerId: 'F1', amount: 5000 };
      validateInitiatePayment(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test.each(['farmerId', 'amount'])('returns 400 when %s is missing', (field) => {
      req.body = { farmerId: 'F1', amount: 5000 };
      delete req.body[field];
      validateInitiatePayment(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 400 when amount is 0 (falsy edge — zero-amount payment rejected)', () => {
      req.body = { farmerId: 'F1', amount: 0 };
      validateInitiatePayment(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateGetPaymentDetails', () => {
    test('calls next() when id param is present', () => {
      req.params = { id: 'pay_123' };
      validateGetPaymentDetails(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 400 when id param is missing', () => {
      validateGetPaymentDetails(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});