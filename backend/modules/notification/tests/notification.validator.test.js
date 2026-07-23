const {
  validateGetNotifications,
  validateRegisterPushToken,
} = require('../notification.validator');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('notification validators', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {} };
    res = mockRes();
    next = jest.fn();
  });

  describe('validateGetNotifications', () => {
    test('calls next() when farmerId is in query', () => {
      req.query = { farmerId: 'F1' };
      validateGetNotifications(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 400 when farmerId is missing', () => {
      validateGetNotifications(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateRegisterPushToken', () => {
    test('calls next() with userId and pushToken', () => {
      req.body = { userId: 'U1', pushToken: 'ExponentPushToken[abc]' };
      validateRegisterPushToken(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test.each(['userId', 'pushToken'])('returns 400 when %s is missing', (field) => {
      req.body = { userId: 'U1', pushToken: 'ExponentPushToken[abc]' };
      delete req.body[field];
      validateRegisterPushToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
