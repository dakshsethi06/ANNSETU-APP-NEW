const db = require('../../../config/database');
const farmerRepository = require('../farmer.repository');
const crypto = require('crypto');
const { sendSMS, sendEmail } = require('../../../shared/notifications');
const otpStore = require('./otpStore');

async function sendResetOtp(req, res) {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required.' });
  }

  try {
    const cleanPhone = phone.replace(/\+91/g, '').replace(/\s+/g, '').trim();

    // 1. Check if Farmer exists
    const farmer = await farmerRepository.getFarmerByPhone(cleanPhone);
    let targetUser = farmer;
    let userType = 'farmer';

    // 2. Fallback: Check if Cold Storage exists
    if (!targetUser) {
      const csRes = await db.query(
        'SELECT id, "displayName", email, phone, "account_status" FROM "ColdStorageOnboarding" WHERE phone = $1 OR phone = $2',
        [cleanPhone, '+91' + cleanPhone]
      );
      if (csRes.rows[0]) {
        targetUser = csRes.rows[0];
        userType = 'cold_storage';
      }
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'This phone number is not registered.' });
    }

    if (targetUser.account_status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: "Sorry, can't reset MPIN. Your account is suspended." });
    }

    // 3. Generate a 6-digit OTP code
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // Store in our shared in-memory store (expires in 5 minutes)
    otpStore.set(cleanPhone, {
      code: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    let smsSent = false;
    let emailSent = false;
    let sendErrors = [];

    // Send SMS
    try {
      const message = `Your Annsetu MPIN reset verification code is: ${otpCode}. Valid for 5 minutes.`;
      await sendSMS({ to: cleanPhone, message });
      smsSent = true;
    } catch (err) {
      console.warn('[MPIN Reset] sendSMS failed:', err.message);
      sendErrors.push(`SMS: ${err.message}`);
    }

    // Send Email if available
    const userEmail = targetUser.email || '';
    if (userEmail) {
      try {
        const cleanEmail = userEmail.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (cleanEmail && emailRegex.test(cleanEmail)) {
          const subject = 'Annsetu MPIN Reset Verification';
          const text = `Your Annsetu verification code to reset your MPIN is: ${otpCode}. Valid for 5 minutes.`;
          await sendEmail({ to: cleanEmail, subject, text });
          emailSent = true;
        }
      } catch (err) {
        console.warn('[MPIN Reset] sendEmail failed:', err.message);
        sendErrors.push(`Email: ${err.message}`);
      }
    }

    // Fallback: If Twilio/SMTP fails to deliver, print OTP to console
    if (!smsSent && !emailSent) {
      console.log(`
[MOCK OTP RESET SMS/EMAIL FALLBACK]
To: ${cleanPhone}
Email: ${userEmail || 'None'}
OTP Code: ${otpCode}
Reason: Centralized delivery channels failed (${sendErrors.join(', ')})
-----------------------------------------`);
    }

    return res.json({ success: true, message: 'Verification OTP sent successfully.' });
  } catch (error) {
    console.error('PostgreSQL sendResetOtp error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send reset OTP.' });
  }
}

module.exports = { sendResetOtp };
