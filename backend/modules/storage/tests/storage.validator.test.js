const { validateRegisterColdStorage } = require('../storage.validator');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('validateRegisterColdStorage', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = mockRes();
    next = jest.fn();
  });

  test('calls next() with id and displayName', () => {
    req.body = { id: 'CS1', displayName: 'Sharma Cold Storage' };
    validateRegisterColdStorage(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test.each(['id', 'displayName'])('returns 400 when %s is missing', (field) => {
    req.body = { id: 'CS1', displayName: 'Sharma Cold Storage' };
    delete req.body[field];
    validateRegisterColdStorage(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 for empty body', () => {
    validateRegisterColdStorage(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});