const { validateUserRole } = require('../modules/user-role/user-role.validator');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('validateUserRole', () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {} };
    res = mockRes();
    next = jest.fn();
  });

  test('calls next() when phone is in query', () => {
    req.query = { phone: '9876543210' };
    validateUserRole(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 400 when phone is missing', () => {
    validateUserRole(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});