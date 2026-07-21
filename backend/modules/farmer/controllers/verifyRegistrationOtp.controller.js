const otpStore = require('./otpStore');

async function verifyRegistrationOtp(req, res) {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'Phone number and OTP code are required.' });
  }

  try {
    const cleanPhone = phone.toString().replace(/\+91/g, '').replace(/\D/g, '').trim();
    const cleanOtp = otp.toString().trim();


    const storedData = otpStore.get(cleanPhone);
    if (!storedData) {
      return res.status(400).json({ success: false, error: 'No OTP requested or OTP has expired.' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new code.' });
    }

    if (storedData.code !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid verification code.' });
    }

    // Successfully verified -> clear from store
    otpStore.delete(cleanPhone);

    return res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('verifyRegistrationOtp error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to verify OTP.' });
  }
}

module.exports = { verifyRegistrationOtp };
