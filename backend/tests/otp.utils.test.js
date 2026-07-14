jest.mock('axios');
jest.mock('../config', () => ({
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-anon-key',
}));

const axios = require('axios');
const { verifySupabaseOtp } = require('../shared/utils/otpUtils');

describe('verifySupabaseOtp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns true on successful verification (200)', async () => {
    axios.post.mockResolvedValue({ status: 200, data: { user: { id: 'u1' } } });
    const result = await verifySupabaseOtp('9876543210', '123456');
    expect(result).toBe(true);
  });

  test('formats 10-digit Indian phone with +91 prefix', async () => {
    axios.post.mockResolvedValue({ status: 200, data: {} });
    await verifySupabaseOtp('9876543210', '123456');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/v1/verify'),
      expect.objectContaining({ phone: '+919876543210' }),
      expect.any(Object)
    );
  });

  test('keeps phone unchanged if it already starts with +', async () => {
    axios.post.mockResolvedValue({ status: 200, data: {} });
    await verifySupabaseOtp('+919876543210', '123456');
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ phone: '+919876543210' }),
      expect.any(Object)
    );
  });

  test('adds + prefix for non-10-digit numbers without +', async () => {
    axios.post.mockResolvedValue({ status: 200, data: {} });
    await verifySupabaseOtp('919876543210', '123456');
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ phone: '+919876543210' }),
      expect.any(Object)
    );
  });

  test('trims whitespace from phone', async () => {
    axios.post.mockResolvedValue({ status: 200, data: {} });
    await verifySupabaseOtp('  9876543210  ', '123456');
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ phone: '+919876543210' }),
      expect.any(Object)
    );
  });

  test('throws descriptive error when Supabase rejects the OTP', async () => {
    axios.post.mockRejectedValue({
      response: { data: { error_description: 'Token has expired or is invalid' } },
    });
    await expect(verifySupabaseOtp('9876543210', '000000')).rejects.toThrow(
      'OTP Verification failed: Token has expired or is invalid'
    );
  });

  test('throws with generic message on network error', async () => {
    axios.post.mockRejectedValue(new Error('Network Error'));
    await expect(verifySupabaseOtp('9876543210', '123456')).rejects.toThrow(
      'OTP Verification failed: Network Error'
    );
  });
});