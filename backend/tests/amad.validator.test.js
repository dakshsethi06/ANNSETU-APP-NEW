const { validateCreateAmad } = require('../modules/amad/amad.validator');

describe('validateCreateAmad', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  const validBody = {
    farmerId: 'F123',
    commodity: 'Potato',
    packets: 50,
    weightQtl: 25.5,
  };

  test('calls next() when all required fields are present', () => {
    req.body = { ...validBody };
    validateCreateAmad(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 400 when farmerId is missing', () => {
    req.body = { ...validBody };
    delete req.body.farmerId;
    validateCreateAmad(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 when commodity is missing', () => {
    req.body = { ...validBody };
    delete req.body.commodity;
    validateCreateAmad(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 when packets is missing', () => {
    req.body = { ...validBody };
    delete req.body.packets;
    validateCreateAmad(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 when weightQtl is missing', () => {
    req.body = { ...validBody };
    delete req.body.weightQtl;
    validateCreateAmad(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 when body is empty', () => {
    req.body = {};
    validateCreateAmad(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 when packets is 0 (falsy edge case)', () => {
    req.body = { ...validBody, packets: 0 };
    validateCreateAmad(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});