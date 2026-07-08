const farmerRepository = require('../farmer.repository');
const db = require('../../../config/database');
const { hashMpin } = require('./mpinHelpers');
const { verifySupabaseOtp } = require('../../../shared/utils/otpUtils');

async function resetMpin(req, res) {
  const { phone, otp, newMpin } = req.body;
  if (!phone || !otp || !newMpin) {
    return res.status(400).json({ success: false, error: 'Phone, OTP, and new MPIN are required.' });
  }
  if (newMpin.length < 4) {
    return res.status(400).json({ success: false, error: 'New MPIN must be at least 4 digits.' });
  }

  try {
    await verifySupabaseOtp(phone, otp);
  } catch (otpErr) {
    return res.status(400).json({ success: false, error: otpErr.message || 'Invalid verification OTP.' });
  }

  try {
    const cleanPhone = phone.replace('+91', '').trim();

    const csRes = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE phone = $1', [cleanPhone]);
    if (csRes.rows.length > 0) {
      const cs = csRes.rows[0];
      const hashedMpin = hashMpin(newMpin);
      await db.query(
        `UPDATE "ColdStorageOnboarding" SET "mpin" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        [hashedMpin, cs.id]
      );
      return res.json({ success: true, message: 'MPIN reset successfully.' });
    }

    const farmer = await farmerRepository.getFarmerByPhone(phone);
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer profile not found.' });
    }

    const hashedMpin = hashMpin(newMpin);
    await db.query(
      `UPDATE "Farmer" SET "mpin" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      [hashedMpin, farmer.id]
    );

    return res.json({ success: true, message: 'MPIN reset successfully.' });
  } catch (error) {
    console.error('PostgreSQL reset-mpin error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reset MPIN.' });
  }
}

module.exports = { resetMpin };
