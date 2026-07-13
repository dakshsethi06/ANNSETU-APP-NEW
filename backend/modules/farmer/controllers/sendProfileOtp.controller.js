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

    // Clean target value (the new value to be verified and eventually updated)
    const cleanTargetValue = targetType === 'phone'
      ? targetValue.replace('+91', '').trim()
      : targetValue.trim().toLowerCase();

    // Fetch existing farmer details to send OTP to old/existing credentials
    const farmer = await farmerRepository.getFarmerBasicDetails(id);
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer profile not found.' });
    }

    // Deliver the OTP ONLY to the already verified existing phone and email
    const smsTarget = farmer.phone || '';
    const emailTarget = farmer.email || '';

    // Delete existing OTPs for this farmer and target type
    await farmerRepository.deleteOtpVerification(id, targetType);

    // Generate unique verification ID
    const verificationId = 'otp_' + crypto.randomBytes(8).toString('hex');

    // Insert new OTP with 5-minute expiry (associated with the NEW target value)
    await farmerRepository.insertOtpVerification(verificationId, id, targetType, cleanTargetValue, otpCode);

    let smsSent = false;
    let emailSent = false;
    let sendErrors = [];

    // Send SMS to existing phone
    if (smsTarget) {
      try {
        const cleanSmsTarget = smsTarget.replace('+91', '').trim();
        if (cleanSmsTarget && cleanSmsTarget.length === 10 && !isNaN(cleanSmsTarget)) {
          const message = `Your Annsetu verification code is: ${otpCode}. Valid for 5 minutes.`;
          await sendSMS({ to: cleanSmsTarget, message });
          smsSent = true;
        }
      } catch (err) {
        console.warn('sendSMS failed in sendProfileOtp:', err.message);
        sendErrors.push(`SMS: ${err.message}`);
      }
    }

    // Send Email to existing email
    if (emailTarget) {
      try {
        const cleanEmailTarget = emailTarget.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (cleanEmailTarget && emailRegex.test(cleanEmailTarget)) {
          const subject = 'Annsetu Profile Verification';
          const text = `Your Annsetu verification code is: ${otpCode}. Valid for 5 minutes.`;
          await sendEmail({ to: cleanEmailTarget, subject, text });
          emailSent = true;
        }
      } catch (err) {
        console.warn('sendEmail failed in sendProfileOtp:', err.message);
        sendErrors.push(`Email: ${err.message}`);
      }
    }

    // Ensure at least one notification channel was successfully used
    if (!smsSent && !emailSent) {
      throw new Error(`Failed to send verification code. Details: ${sendErrors.join(', ')}`);
    }

    return res.json({ success: true, message: 'Verification OTP sent successfully.' });
  } catch (error) {
    console.error('PostgreSQL sendProfileOtp error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send verification OTP.' });
  }
}

module.exports = { sendProfileOtp };
