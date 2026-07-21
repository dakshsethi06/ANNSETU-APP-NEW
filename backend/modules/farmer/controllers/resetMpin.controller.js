const farmerRepository = require('../farmer.repository');
const farmerConstants = require('../farmer.constants');
const db = require('../../../config/database');
const { hashMpin } = require('./mpinHelpers');
const otpStore = require('./otpStore');
const config = require('../../../config');

async function resetMpin(req, res) {
  const { phone, otp, newMpin } = req.body;
  if (!phone || !otp || !newMpin) {
    return res.status(400).json({ success: false, error: 'Phone, OTP, and new MPIN are required.' });
  }
  if (newMpin.length < 4) {
    return res.status(400).json({ success: false, error: 'New MPIN must be at least 4 digits.' });
  }

  const cleanPhone = phone.replace(/\+91/g, '').replace(/\s+/g, '').trim();

  // Validate OTP from in-memory cache
  const cached = otpStore.get(cleanPhone);
  
  if (!cached || cached.expiresAt < Date.now() || cached.code !== otp.trim()) {
    return res.status(400).json({ success: false, error: 'Invalid or expired verification OTP.' });
  }

  // Clear OTP from cache if verified
  if (cached) {
    otpStore.delete(cleanPhone);
  }

  try {
    const cs = await farmerRepository.getColdStorageByPhone(cleanPhone);
    if (cs) {
      const hashedMpin = hashMpin(newMpin);
      await farmerRepository.updateColdStorageMpin(cs.id, hashedMpin);
      return res.json({ success: true, message: 'MPIN reset successfully.' });
    }

    const farmer = await farmerRepository.getFarmerByPhone(phone);
    if (!farmer) {
      return res.status(404).json({ success: false, error: farmerConstants.ERROR_MESSAGES.FARMER_NOT_FOUND });
    }

    const hashedMpin = hashMpin(newMpin);
    await farmerRepository.updateFarmerMpin(farmer.id, hashedMpin);

    return res.json({ success: true, message: 'MPIN reset successfully.' });
  } catch (error) {
    console.error('PostgreSQL reset-mpin error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reset MPIN.' });
  }
}

module.exports = { resetMpin };
