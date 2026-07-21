const crypto = require('crypto');
const { sendSMS, sendEmail } = require('../../../shared/notifications');
const otpStore = require('./otpStore');

async function sendRegistrationOtp(req, res) {
  const { phone, email } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required.' });
  }

  try {
    const cleanPhone = phone.toString().replace(/\+91/g, '').replace(/\D/g, '').trim();
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number.' });
    }

    // 1. Generate 6-digit OTP code
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // 2. Store in shared in-memory store (expires in 5 minutes)
    otpStore.set(cleanPhone, {
      code: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    let smsSent = false;
    let emailSent = false;
    let sendErrors = [];

    // 3. Send SMS via Centralized Notification Service (Twilio)
    try {
      const message = `Your Annsetu verification code is: ${otpCode}. Valid for 5 minutes.`;
      await sendSMS({ to: cleanPhone, message });
      smsSent = true;
    } catch (err) {
      console.warn('[Registration OTP] sendSMS failed:', err.message);
      sendErrors.push(`SMS: ${err.message}`);
    }

    // 4. Send Email if provided
    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (cleanEmail && emailRegex.test(cleanEmail)) {
        try {
          const subject = 'Annsetu Account Registration Verification';
          const text = `Your Annsetu verification code is: ${otpCode}. Valid for 5 minutes.`;
          await sendEmail({ to: cleanEmail, subject, text });
          emailSent = true;
        } catch (err) {
          console.warn('[Registration OTP] sendEmail failed:', err.message);
          sendErrors.push(`Email: ${err.message}`);
        }
      }
    }

    // Fallback log for dev/debugging
    if (!smsSent && !emailSent) {
      console.log(`
[MOCK REGISTRATION OTP FALLBACK]
To: ${cleanPhone}
Email: ${email || 'None'}
OTP Code: ${otpCode}
Reason: Delivery failed (${sendErrors.join(', ')})
-----------------------------------------`);
    }

    return res.json({ success: true, message: 'Verification OTP sent successfully.' });
  } catch (error) {
    console.error('sendRegistrationOtp error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send registration OTP.' });
  }
}

module.exports = { sendRegistrationOtp };
