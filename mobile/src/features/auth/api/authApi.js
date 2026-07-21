import { clientFetch } from '../../../core/network/client';

/**
 * Log in a user using their mobile number and MPIN
 */
export async function loginWithMpin(phone, mpin) {
  return clientFetch('/api/farmer/login', {
    method: 'POST',
    body: JSON.stringify({ phone, mpin }),
  });
}

/**
 * Send an OTP code to a user's mobile number for verification or password reset
 */
export async function sendOtpSms(phone) {
  return clientFetch('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

/**
 * Verify SMS OTP code
 */
export async function verifyOtpSms(phone, otp) {
  return clientFetch('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
}
