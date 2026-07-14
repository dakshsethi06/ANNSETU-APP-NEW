jest.mock('axios');
jest.mock('../config', () => ({
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-anon-key',
}));

const axios = require('axios');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../shared/middleware/auth.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'annsetu_jwt_secret_key';

describe('auth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { originalUrl: '/api/farmers/ledger', method: 'GET', headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('public routes', () => {
    test.each([
      ['/api/farmers/login-mpin', 'POST'],
      ['/api/mandi-prices', 'GET'],
      ['/api/weather', 'GET'],
      ['/api/payments/webhook', 'POST'],
    ])('allows %s %s without a token', async (path, method) => {
      req.originalUrl = path;
      req.method = method;
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('public route with query string still matches (path split on ?)', async () => {
      req.originalUrl = '/api/mandi-prices?commodity=potato';
      req.method = 'GET';
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('same path with wrong method is NOT public', async () => {
      req.originalUrl = '/api/mandi-prices';
      req.method = 'DELETE';
      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('mock-checkout prefix is public', async () => {
      req.originalUrl = '/api/payments/mock-checkout/order_123';
      req.method = 'GET';
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('protected routes', () => {
    test('rejects request with no Authorization header → 401', async () => {
      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects header without Bearer prefix → 401', async () => {
      req.headers.authorization = 'Basic abc123';
      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('accepts valid local JWT and attaches decoded user', async () => {
      const token = jwt.sign({ userId: 'F1', role: 'farmer' }, JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toMatchObject({ userId: 'F1', role: 'farmer' });
    });

    test('rejects expired local JWT (and failed Supabase fallback) → 401', async () => {
      const expired = jwt.sign({ userId: 'F1' }, JWT_SECRET, { expiresIn: '-1h' });
      req.headers.authorization = `Bearer ${expired}`;
      axios.get.mockRejectedValue(new Error('unauthorized'));
      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('falls back to Supabase verification when local JWT fails', async () => {
      req.headers.authorization = 'Bearer supabase-style-token';
      axios.get.mockResolvedValue({
        status: 200,
        data: { id: 'sb-user-1', phone: '9876543210' },
      });
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toMatchObject({ id: 'sb-user-1', role: 'authenticated' });
    });

    test('rejects when both local JWT and Supabase verification fail → 401', async () => {
      req.headers.authorization = 'Bearer totally-invalid';
      axios.get.mockRejectedValue(new Error('invalid'));
      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});