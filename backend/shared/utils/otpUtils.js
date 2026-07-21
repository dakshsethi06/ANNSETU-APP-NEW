const axios = require('axios');
const config = require('../../config');

/**
 * Verifies a phone OTP against Supabase Auth.
 * @param {string} phone - The phone number.
 * @param {string} token - The OTP token.
 * @returns {Promise<boolean>} True if verified, throws error otherwise.
 */
async function verifySupabaseOtp(phone, token) {
  let formattedPhone = phone.trim();
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.length === 10) {
      formattedPhone = '+91' + formattedPhone;
    } else {
      formattedPhone = '+' + formattedPhone;
    }
  }

  const { supabaseUrl, supabaseAnonKey } = config;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is not configured on the backend.');
  }

  try {
    const response = await axios.post(`${supabaseUrl}/auth/v1/verify`, {
      type: 'sms',
      phone: formattedPhone,
      token: token
    }, {
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data) {
      return true;
    }
    return false;
  } catch (error) {
    const errorMsg = error.response?.data?.error_description || error.response?.data?.msg || error.message;
    throw new Error(`OTP Verification failed: ${errorMsg}`);
  }
}

module.exports = {
  verifySupabaseOtp
};
