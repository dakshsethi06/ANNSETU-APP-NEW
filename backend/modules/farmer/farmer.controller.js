const farmerRepository = require('./farmer.repository');
const crypto = require('crypto');
const db = require('../../config/database');

function hashMpin(mpin) {
  if (!mpin) return '';
  return crypto.createHash('sha256').update(mpin.toString()).digest('hex');
}

function verifyMpin(mpin, storedHash) {
  if (!storedHash) return false;
  if (!mpin) return false;
  if (storedHash.length !== 64) {
    return storedHash.toString() === mpin.toString();
  }
  return hashMpin(mpin) === storedHash;
}

async function getFarmers(req, res) {
  try {
    const { state, serial_number } = req.query;
    const farmers = await farmerRepository.getFarmersData(state, serial_number);
    return res.json({ success: true, farmers });
  } catch (error) {
    console.error('PostgreSQL farmers GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch farmers from database' });
  }
}

async function registerFarmer(req, res) {
  const { serial_number, name, state, commodity, phone, fatherName, village, district, tehsil, mpin } = req.body;
  if (!serial_number || !name) {
    return res.status(400).json({ success: false, error: 'serial_number and name are required fields' });
  }

  try {
    const finalState = state || 'Rajasthan';
    const finalCommodity = commodity || 'Potato';
    const now = new Date();

    const hashedMpin = hashMpin(mpin || '1234');

    const params = [
      serial_number, 'CS-' + serial_number, name, finalState, finalCommodity, true, 0.0, 10000.0, 0.0, false,
      now, true, now, now, 'cmmp9txv0000ai3t4wush9trs', true, phone || null, fatherName || null,
      village || null, district || null, tehsil || null, hashedMpin
    ];

    await farmerRepository.createFarmerRecord(params);

    try {
      const { logOutboundNotification, createAppNotification } = require('../../shared/notifications/notifications');
      await logOutboundNotification({
        coldStorageId: 'cmmp9txv0000ai3t4wush9trs', channel: 'SMS', eventType: 'FARMER_REGISTERED',
        recipientPhone: phone || null, recipientName: name,
        message: `Welcome ${name}! Your farmer account at SN Sharma Cold Storage has been registered. Account Number: CS-${serial_number}.`,
        relatedModel: 'Farmer', relatedId: serial_number
      });

      await createAppNotification({
        coldStorageId: 'cmmp9txv0000ai3t4wush9trs', userId: serial_number, type: 'info',
        title: 'Welcome to Annsetu', message: `Welcome ${name}! Your account has been registered successfully.`, icon: 'info'
      });
    } catch (notifErr) { console.warn('Welcome notifications failed to trigger:', notifErr.message); }

    return res.status(201).json({
      success: true,
      farmer: { serial_number, name, state: finalState, commodity: finalCommodity, phone: phone || null, fatherName: fatherName || null, village: village || null, district: district || null, tehsil: tehsil || null }
    });
  } catch (error) {
    console.error('PostgreSQL farmers POST error:', error.message);
    if (error.code === '23505') { return res.status(400).json({ success: false, error: `Farmer with serial number ${serial_number} already exists` }); }
    return res.status(500).json({ success: false, error: error.message || 'Failed to register farmer in database' });
  }
}

async function getLedger(req, res) {
  try {
    const { id } = req.params;
    const ledger = await farmerRepository.getFarmerLedger(id);
    return res.json({ success: true, ledger });
  } catch (error) {
    console.error('PostgreSQL ledger GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ledger from database' });
  }
}

async function loginMpin(req, res) {
  const { phone, mpin } = req.body;
  if (!phone || !mpin) {
    return res.status(400).json({ success: false, error: 'Phone number and MPIN are required.' });
  }

  try {
    // 1. Check if the phone number belongs to a Cold Storage Facility first
    const csRes = await db.query('SELECT id, "displayName", mpin FROM "ColdStorageOnboarding" WHERE phone = $1', [phone]);
    if (csRes.rows.length > 0) {
      const cs = csRes.rows[0];
      // Verification: using verifyMpin with SHA-256 hash (defaulting to '1111' hash if not set)
      const csMpin = cs.mpin || '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c';
      if (!verifyMpin(mpin, csMpin)) {
        return res.status(401).json({ success: false, error: 'Invalid MPIN for Cold Storage. Please try again.' });
      }
      return res.json({
        success: true,
        role: 'ColdStorageFacility',
        coldStorage: {
          id: cs.id,
          name: cs.displayName,
          phone: phone
        }
      });
    }

    // 2. If not a Cold Storage, proceed with Farmer login
    const farmer = await farmerRepository.getFarmerByPhone(phone);
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer profile not found.' });
    }

    const farmerMpin = farmer.mpin || '1234';
    if (!verifyMpin(mpin, farmerMpin)) {
      return res.status(401).json({ success: false, error: 'Invalid MPIN. Please try again.' });
    }

    return res.json({
      success: true,
      role: 'ColdStorage', // Maps to Farmer Dashboard role
      farmer: {
        id: farmer.id,
        name: farmer.name,
        phone: farmer.phone,
        state: farmer.state
      }
    });
  } catch (error) {
    console.error('PostgreSQL login-mpin error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to authenticate via MPIN.' });
  }
}

async function resetMpin(req, res) {
  const { phone, otp, newMpin } = req.body;
  if (!phone || !otp || !newMpin) {
    return res.status(400).json({ success: false, error: 'Phone, OTP, and new MPIN are required.' });
  }
  if (otp !== '1234') {
    return res.status(400).json({ success: false, error: 'Invalid verification OTP.' });
  }
  if (newMpin.length < 4) {
    return res.status(400).json({ success: false, error: 'New MPIN must be at least 4 digits.' });
  }

  try {
    const db = require('../../config/database');
    const cleanPhone = phone.replace('+91', '').trim();

    // Check if the phone number belongs to a Cold Storage Facility first
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

module.exports = { getFarmers, registerFarmer, getLedger, loginMpin, resetMpin };
