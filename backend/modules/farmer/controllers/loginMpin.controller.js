const farmerRepository = require('../farmer.repository');
const farmerConstants = require('../farmer.constants');
const db = require('../../../config/database');
const { verifyMpin } = require('./mpinHelpers');
const jwt = require('jsonwebtoken');

async function loginMpin(req, res) {
  const { phone, mpin, role } = req.body;
  if (!phone || !mpin) {
    return res.status(400).json({ success: false, error: 'Phone number and MPIN are required.' });
  }

  try {
    // 1. Try Farmer first
    const farmer = await farmerRepository.getFarmerByPhone(phone);
    if (farmer) {
      const farmerMpin = farmer.mpin || '1234';
      if (verifyMpin(mpin, farmerMpin)) {
        const token = jwt.sign(
          { id: farmer.id, phone: farmer.phone, role: 'ColdStorage' }, // Mobile App expects 'ColdStorage' for Farmer role
          process.env.JWT_SECRET || 'annsetu_jwt_secret_key',
          { expiresIn: '7d' }
        );
        return res.json({
          success: true,
          token,
          role: 'ColdStorage',
          farmer: { id: farmer.id, name: farmer.name, phone: farmer.phone, state: farmer.state }
        });
      }
    }

    // 2. Try Cold Storage Facility as fallback
    const cs = await farmerRepository.getColdStorageByPhone(phone);
    if (cs) {
      const csMpin = cs.mpin || '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c';
      if (verifyMpin(mpin, csMpin)) {
        const token = jwt.sign(
          { id: cs.id, phone: phone, role: farmerConstants.ROLES.COLD_STORAGE_FACILITY },
          process.env.JWT_SECRET || 'annsetu_jwt_secret_key',
          { expiresIn: '7d' }
        );
        return res.json({
          success: true,
          token,
          role: farmerConstants.ROLES.COLD_STORAGE_FACILITY,
          coldStorage: { id: cs.id, name: cs.displayName, phone: phone }
        });
      }
    }

    return res.status(401).json({ success: false, error: 'Invalid phone number or MPIN. Please try again.' });
  } catch (error) {
    console.error('PostgreSQL login-mpin error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to authenticate via MPIN.' });
  }
}

module.exports = { loginMpin };
