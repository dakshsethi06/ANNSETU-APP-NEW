const farmerRepository = require('../farmer.repository');
const db = require('../../../config/database');
const { verifyMpin } = require('./mpinHelpers');

async function loginMpin(req, res) {
  const { phone, mpin, role } = req.body;
  if (!phone || !mpin) {
    return res.status(400).json({ success: false, error: 'Phone number and MPIN are required.' });
  }

  try {
    const isColdStorageRole = role === 'ColdStorageFacility' || role === 'coldstorage';
    const isFarmerRole = role === 'ColdStorage' || role === 'farmer';

    if (!isFarmerRole) {
      const csRes = await db.query('SELECT id, "displayName", mpin FROM "ColdStorageOnboarding" WHERE phone = $1', [phone]);
      if (csRes.rows.length > 0) {
        const cs = csRes.rows[0];
        const csMpin = cs.mpin || '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c';
        if (verifyMpin(mpin, csMpin)) {
          return res.json({
            success: true,
            role: 'ColdStorageFacility',
            coldStorage: { id: cs.id, name: cs.displayName, phone: phone }
          });
        } else if (isColdStorageRole) {
          return res.status(401).json({ success: false, error: 'Invalid MPIN for Cold Storage. Please try again.' });
        }
      }
    }

    const farmer = await farmerRepository.getFarmerByPhone(phone);
    if (farmer) {
      const farmerMpin = farmer.mpin || '1234';
      if (verifyMpin(mpin, farmerMpin)) {
        return res.json({
          success: true,
          role: 'ColdStorage',
          farmer: { id: farmer.id, name: farmer.name, phone: farmer.phone, state: farmer.state }
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
