const db = require('../../../config/database');
const farmerRepository = require('../farmer.repository');
const farmerConstants = require('../farmer.constants');
const crypto = require('crypto');
const { sendSMS, sendEmail } = require('../../../shared/notifications');

async function sendProfileOtp(req, res) {
  const { id, targetType, targetValue } = req.body;
  if (!id || !targetType || !targetValue) {
    return res.status(400).json({ success: false, error: 'id, targetType, and targetValue are required' });
  }
  if (targetType !== 'phone' && targetType !== 'email') {
    return res.status(400).json({ success: false, error: 'targetType must be phone or email' });
  }

  try {
    // Generate 6-digit OTP code
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // Clean target value
    const cleanTargetValue = targetType === 'phone'
      ? targetValue.replace('+91', '').trim()
      : targetValue.trim().toLowerCase();

    // Delete existing OTPs for this farmer and target type
    await farmerRepository.deleteOtpVerification(id, targetType);

    // Generate unique verification ID
    const verificationId = 'otp_' + crypto.randomBytes(8).toString('hex');

    // Insert new OTP with 5-minute expiry
    await farmerRepository.insertOtpVerification(verificationId, id, targetType, cleanTargetValue, otpCode);

    // Send the code
    if (targetType === 'phone') {
      const message = `Your Annsetu verification code is: ${otpCode}. Valid for 5 minutes.`;
      await sendSMS({ to: cleanTargetValue, message });
    } else {
      const subject = 'Annsetu Profile Verification';
      const text = `Your verification code to update your email address is: ${otpCode}. Valid for 5 minutes.`;
      await sendEmail({ to: cleanTargetValue, subject, text });
    }

    return res.json({ success: true, message: 'Verification OTP sent successfully.' });
  } catch (error) {
    console.error('PostgreSQL sendProfileOtp error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send verification OTP.' });
  }
}

module.exports = { sendProfileOtp };
