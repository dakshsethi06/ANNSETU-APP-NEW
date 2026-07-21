const farmerRepository = require('../farmer.repository');
const farmerConstants = require('../farmer.constants');
const config = require('../../../config');

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
    const otpRec = await farmerRepository.getOtpVerification(id, targetType);

    if (!otpRec || otpRec.code !== otpCode.trim() || otpRec.targetValue !== cleanTargetValue) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification OTP.' });
    }

    // OTP is valid! Proceed to update the profile details
    // We fetch the existing record first to get current values
    const current = await farmerRepository.getFarmerBasicDetails(id);
    if (!current) {
      return res.status(404).json({ success: false, error: farmerConstants.ERROR_MESSAGES.FARMER_NOT_FOUND });
    }

    const finalName = name !== undefined ? name : current.name;
    const finalPhone = targetType === 'phone' ? cleanTargetValue : current.phone;
    const finalEmail = targetType === 'email' ? cleanTargetValue : current.email;

    const farmer = await farmerRepository.verifyAndUpdateFarmerProfile(id, finalName, finalPhone, finalEmail);

    // Delete the used OTP code
    await farmerRepository.deleteOtpVerification(id, targetType);

    return res.json({ success: true, farmer: farmer });
  } catch (error) {
    console.error('PostgreSQL verifyAndUpdateProfile error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to verify OTP and update profile.' });
  }
}

module.exports = { verifyAndUpdateProfile };
