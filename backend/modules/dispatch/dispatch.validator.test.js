const {
  validateCreateDispatch,
  validateApproveDispatch,
  validateGetDispatches,
} = require('./dispatch.validator');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('dispatch validators', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {} };
    res = mockRes();
    next = jest.fn();
  });

  describe('validateCreateDispatch', () => {
    const validBody = { farmerId: 'F1', coldStorageId: 'CS1', commodity: 'Potato', bags: 100 };

    test('calls next() with all required fields', () => {
      req.body = { ...validBody };
      validateCreateDispatch(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test.each(['farmerId', 'coldStorageId', 'commodity', 'bags'])(
      'returns 400 when %s is missing',
      (field) => {
        req.body = { ...validBody };
        delete req.body[field];
        validateCreateDispatch(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      }
    );

    test('returns 400 for empty body', () => {
      validateCreateDispatch(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateApproveDispatch', () => {
    test('calls next() when mpin is present', () => {
      req.body = { mpin: '1234' };
      validateApproveDispatch(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 400 when mpin is missing', () => {
      validateApproveDispatch(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateGetDispatches', () => {
    test('calls next() with farmerId only', () => {
      req.query = { farmerId: 'F1' };
      validateGetDispatches(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('calls next() with coldStorageId only', () => {
      req.query = { coldStorageId: 'CS1' };
      validateGetDispatches(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 400 when both are missing', () => {
      validateGetDispatches(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});