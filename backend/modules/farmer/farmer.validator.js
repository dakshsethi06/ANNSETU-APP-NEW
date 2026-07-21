/**
 * Farmer request validation middleware.
 */

function validateRegisterFarmer(req, res, next) {
  const { serial_number, name } = req.body;
  if (!serial_number || !name) {
    return res.status(400).json({
      success: false,
      error: 'serial_number and name are required fields'
    });
  }
  next();
}

function validateLoginMpin(req, res, next) {
  const { phone, mpin } = req.body;
  if (!phone || !mpin) {
    return res.status(400).json({
      success: false,
      error: 'Phone number and MPIN are required.'
    });
  }
  next();
}

function validateResetMpin(req, res, next) {
  const { phone, otp, newMpin } = req.body;
  if (!phone || !otp || !newMpin) {
    return res.status(400).json({
      success: false,
      error: 'Phone, OTP, and new MPIN are required.'
    });
  }
  next();
}

module.exports = { validateRegisterFarmer, validateLoginMpin, validateResetMpin };
