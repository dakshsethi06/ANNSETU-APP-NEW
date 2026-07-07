const db = require('../../../config/database');

async function verifyAndUpdateProfile(req, res) {
  const { id, targetType, targetValue, otpCode, name } = req.body;
  if (!id || !targetType || !targetValue || !otpCode) {
    return res.status(400).json({ success: false, error: 'id, targetType, targetValue, and otpCode are required' });
  }

  try {
    const cleanTargetValue = targetType === 'phone'
      ? targetValue.replace('+91', '').trim()
      : targetValue.trim().toLowerCase();

    // Query pending OTP
    const otpRes = await db.query(
      `SELECT * FROM "OtpVerification"
     WHERE "farmerId" = $1 AND "targetType" = $2 AND "targetValue" = $3 AND "code" = $4 AND "expiresAt" > NOW()
     LIMIT 1`,
      [id, targetType, cleanTargetValue, otpCode.trim()]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification OTP.' });
    }

    // OTP is valid! Proceed to update the profile details
    // We fetch the existing record first to get current values
    const existing = await db.query('SELECT * FROM "Farmer" WHERE "id" = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Farmer profile not found.' });
    }

    const current = existing.rows[0];
    const finalName = name !== undefined ? name : current.name;
    const finalPhone = targetType === 'phone' ? cleanTargetValue : current.phone;
    const finalEmail = targetType === 'email' ? cleanTargetValue : current.email;

    const result = await db.query(
      `UPDATE "Farmer"
     SET "name" = $1,
         "phone" = $2,
         "email" = $3,
         "updatedAt" = NOW()
     WHERE "id" = $4
     RETURNING "id" AS "serial_number", "name", "state", "primaryCrop" AS commodity, "fatherName", "phone", "email", "village", "district", "tehsil"`,
      [finalName, finalPhone, finalEmail, id]
    );

    // Delete the used OTP code
    await db.query('DELETE FROM "OtpVerification" WHERE "farmerId" = $1 AND "targetType" = $2', [id, targetType]);

    return res.json({ success: true, farmer: result.rows[0] });
  } catch (error) {
    console.error('PostgreSQL verifyAndUpdateProfile error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to verify OTP and update profile.' });
  }
}

module.exports = { verifyAndUpdateProfile };
