const {
  validateCreateSupportTicket,
  validateGetTickets,
} = require('../modules/support/support.validator');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('support validators', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {} };
    res = mockRes();
    next = jest.fn();
  });

  describe('validateCreateSupportTicket', () => {
    test('calls next() with subject and description', () => {
      req.body = { subject: 'App issue', description: 'Payment page crashes' };
      validateCreateSupportTicket(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 400 when subject is missing', () => {
      req.body = { description: 'Payment page crashes' };
      validateCreateSupportTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 400 when subject is whitespace only', () => {
      req.body = { subject: '   ', description: 'Payment page crashes' };
      validateCreateSupportTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 400 when description is missing', () => {
      req.body = { subject: 'App issue' };
      validateCreateSupportTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 when description is whitespace only', () => {
      req.body = { subject: 'App issue', description: '  ' };
      validateCreateSupportTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateGetTickets', () => {
    test('calls next() when phone is in query', () => {
      req.query = { phone: '9876543210' };
      validateGetTickets(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 400 when phone is missing', () => {
      validateGetTickets(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});