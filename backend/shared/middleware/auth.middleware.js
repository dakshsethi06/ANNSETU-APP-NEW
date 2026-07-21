const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../../config');

const PUBLIC_ROUTES = [
  { path: '/api/farmers/login-mpin', method: 'POST' },
  { path: '/api/farmers/reset-mpin/send-otp', method: 'POST' },
  { path: '/api/farmers/reset-mpin', method: 'POST' },
  { path: '/api/farmers/register/send-otp', method: 'POST' },
  { path: '/api/farmers/register/verify-otp', method: 'POST' },
  { path: '/api/farmers', method: 'POST' },
  { path: '/api/cold-storages', method: 'GET' },
  { path: '/api/cold-storages', method: 'POST' },
  { path: '/api/mandi-prices', method: 'GET' },
  { path: '/api/weather', method: 'GET' },
  { path: '/api/user-role', method: 'GET' },
  { path: '/api/payments/webhook', method: 'POST' },
  { path: '/api/payments/success', method: 'GET' }
];

async function verifySupabaseToken(token) {
  const { supabaseUrl, supabaseAnonKey } = config;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  try {
    const response = await axios.get(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });
    if (response.status === 200 && response.data) {
      return response.data;
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = async (req, res, next) => {
  const pathOnly = req.originalUrl.split('?')[0];

  const isPublic = PUBLIC_ROUTES.some(route => {
    if (pathOnly.startsWith('/api/payments/mock-checkout/')) {
      return true;
    }
    return route.path === pathOnly && route.method === req.method;
  });

  if (isPublic) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (config.nodeEnv === 'development') {
      req.user = { id: 'dev-user-id', phone: '7895544442', role: 'authenticated' };
      return next();
    }
    return res.status(401).json({ success: false, error: 'Authorization token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // 1. Try verifying with local JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'annsetu_jwt_secret_key');
    req.user = decoded;
    return next();
  } catch (error) {
    // 2. Try verifying as a Supabase token
    try {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        req.user = {
          id: supabaseUser.id,
          phone: supabaseUser.phone,
          role: 'authenticated'
        };
        return next();
      }
    } catch (supabaseErr) {
      // Fall through to dev fallback / 401
    }

    if (config.nodeEnv === 'development') {
      req.user = { id: 'dev-user-id', phone: '7895544442', role: 'authenticated' };
      return next();
    }
    return res.status(401).json({ success: false, error: 'Invalid or expired authorization token.' });
  }
};
