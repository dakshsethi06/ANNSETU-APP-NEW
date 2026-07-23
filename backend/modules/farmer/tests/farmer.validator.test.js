const {
  validateRegisterFarmer,
  validateLoginMpin,
  validateResetMpin,
} = require('../farmer.validator');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('farmer validators', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = mockRes();
    next = jest.fn();
  });

  describe('validateRegisterFarmer', () => {
    test('calls next() with serial_number and name', () => {
      req.body = { serial_number: 'SN001', name: 'Ram Singh' };
      validateRegisterFarmer(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test.each(['serial_number', 'name'])('returns 400 when %s is missing', (field) => {
      req.body = { serial_number: 'SN001', name: 'Ram Singh' };
      delete req.body[field];
      validateRegisterFarmer(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateLoginMpin', () => {
    test('calls next() with phone and mpin', () => {
      req.body = { phone: '9876543210', mpin: '1234' };
      validateLoginMpin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test.each(['phone', 'mpin'])('returns 400 when %s is missing', (field) => {
      req.body = { phone: '9876543210', mpin: '1234' };
      delete req.body[field];
      validateLoginMpin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateResetMpin', () => {
    const validBody = { phone: '9876543210', otp: '123456', newMpin: '4321' };

    test('calls next() with phone, otp, and newMpin', () => {
      req.body = { ...validBody };
      validateResetMpin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test.each(['phone', 'otp', 'newMpin'])('returns 400 when %s is missing', (field) => {
      req.body = { ...validBody };
      delete req.body[field];
      validateResetMpin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
