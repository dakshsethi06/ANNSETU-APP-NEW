const farmerService = require('./farmer.service');

async function getFarmers(req, res) {
  try {
    const { state, serial_number } = req.query;
    const farmers = await farmerService.fetchFarmers(state, serial_number);
    return res.json({ success: true, farmers });
  } catch (error) {
    console.error('PostgreSQL farmers GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch farmers from database' });
  }
}

async function registerFarmer(req, res) {
  try {
    const farmer = await farmerService.registerNewFarmer(req.body);
    return res.status(201).json({ success: true, farmer });
  } catch (error) {
    console.error('PostgreSQL farmers POST error:', error.message);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: `Farmer with serial number ${req.body.serial_number} already exists` });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to register farmer in database' });
  }
}

async function getLedger(req, res) {
  try {
    const ledger = await farmerService.fetchLedger(req.params.id);
    return res.json({ success: true, ledger });
  } catch (error) {
    console.error('PostgreSQL ledger GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ledger from database' });
  }
}

async function loginMpin(req, res) {
  try {
    const result = await farmerService.loginWithMpin(req.body.phone, req.body.mpin);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('PostgreSQL login-mpin error:', error.message);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to authenticate via MPIN.' });
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
    try {
      await farmerService.resetUserMpin(req.body.phone, req.body.otp, req.body.newMpin);
      return res.json({ success: true, message: 'MPIN reset successfully.' });
    } catch (error) {
      console.error('PostgreSQL reset-mpin error:', error.message);
      const status = error.statusCode || 500;
      return res.status(status).json({ success: false, error: error.message || 'Failed to reset MPIN.' });
    }
  }

async function updateFarmer(req, res) {
    const { id } = req.params;
    const { name, phone, email } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Farmer ID parameter is required' });
    }

    try {
      const db = require('../../config/database');

      // Fetch first to see if it exists
      const existing = await db.query('SELECT * FROM "Farmer" WHERE "id" = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Farmer profile not found.' });
      }

      const current = existing.rows[0];
      const finalName = name !== undefined ? name : current.name;
      const finalPhone = phone !== undefined ? phone : current.phone;
      const finalEmail = email !== undefined ? email : current.email;

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

      return res.json({ success: true, farmer: result.rows[0] });
    } catch (error) {
      console.error('PostgreSQL updateFarmer error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to update farmer profile.' });
    }
  }

  async function sendProfileOtp(req, res) {
    const { id, targetType, targetValue } = req.body;
    if (!id || !targetType || !targetValue) {
      return res.status(400).json({ success: false, error: 'id, targetType, and targetValue are required' });
    }
    if (targetType !== 'phone' && targetType !== 'email') {
      return res.status(400).json({ success: false, error: 'targetType must be phone or email' });
    }

    try {
      const db = require('../../config/database');
      const { sendSMS, sendEmail } = require('../../shared/notification');

      // Generate 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Clean target value
      const cleanTargetValue = targetType === 'phone'
        ? targetValue.replace('+91', '').trim()
        : targetValue.trim().toLowerCase();

      // Delete existing OTPs for this farmer and target type
      await db.query(
        'DELETE FROM "OtpVerification" WHERE "farmerId" = $1 AND "targetType" = $2',
        [id, targetType]
      );

      // Generate unique verification ID
      const verificationId = 'otp_' + crypto.randomBytes(8).toString('hex');

      // Insert new OTP with 5-minute expiry
      await db.query(
        `INSERT INTO "OtpVerification" ("id", "farmerId", "targetType", "targetValue", "code", "expiresAt")
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 minutes')`,
        [verificationId, id, targetType, cleanTargetValue, otpCode]
      );

      // Send the code
      if (targetType === 'phone') {
        const message = `Your Annsetu verification code is: ${otpCode}. Valid for 5 minutes.`;
        await sendSMS({ to: cleanTargetValue, message });
      } else {
        const subject = 'Annsetu Profile Verification';
        const text = `Your verification code to update your email address is: ${otpCode}. Valid for 5 minutes.`;
        await sendEmail({ to: cleanTargetValue, subject, text });
      }

      return res.json({ success: true, message: 'Verification OTP sent successfully.' });
    } catch (error) {
      console.error('PostgreSQL sendProfileOtp error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to send verification OTP.' });
    }
  }

  async function verifyAndUpdateProfile(req, res) {
    const { id, targetType, targetValue, otpCode, name } = req.body;
    if (!id || !targetType || !targetValue || !otpCode) {
      return res.status(400).json({ success: false, error: 'id, targetType, targetValue, and otpCode are required' });
    }

    try {
      const db = require('../../config/database');
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

  module.exports = { getFarmers, registerFarmer, getLedger, loginMpin, resetMpin, updateFarmer, sendProfileOtp, verifyAndUpdateProfile };
  async function downloadStatement(req, res) {
    try {
      const { id } = req.params;

      // Get farmer profile
      const farmerRes = await db.query('SELECT name, phone, "openingBalance" FROM "Farmer" WHERE id = $1', [id]);
      if (farmerRes.rows.length === 0) {
        return res.status(404).send('Farmer profile not found.');
      }
      const farmer = farmerRes.rows[0];

      const ledger = await farmerRepository.getFarmerLedger(id);

      // Generate CSV contents
      let csv = `Annsetu Farmer Account Statement\n`;
      csv += `Farmer Name,${farmer.name}\n`;
      csv += `Phone,${farmer.phone}\n`;
      csv += `Opening Balance,₹${parseFloat(farmer.openingBalance || 0).toFixed(2)}\n\n`;

      csv += `Date,Description,Amount (₹),Balance (₹)\n`;

      // Ledger is sorted descending in getFarmerLedger, so let's reverse it to chronological order for the statement
      const chronological = [...ledger].reverse();

      chronological.forEach(item => {
        const formattedDate = new Date(item.date).toLocaleDateString('en-IN');
        const amountStr = item.amount < 0
          ? `-${Math.abs(item.amount).toFixed(2)}`
          : `+${Math.abs(item.amount).toFixed(2)}`;
        csv += `"${formattedDate}","${item.title.replace(/"/g, '""')}",${amountStr},${item.balance.toFixed(2)}\n`;
      });

      const { csv, farmerName } = await farmerService.generateStatement(req.params.id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=statement_${farmerName.replace(/\s+/g, '_')}.csv`);
      return res.send(csv);
    } catch (error) {
      console.error('Download statement error:', error.message);
      const status = error.statusCode || 500;
      return res.status(status).send('Failed to generate statement file.');
    }
  }

  async function downloadStatementPdf(req, res) {
    try {
      await farmerService.generateStatementPdf(req.params.id, res);
    } catch (error) {
      console.error('Download statement PDF error:', error.message);
      const status = error.statusCode || 500;
      return res.status(status).send('Failed to generate PDF statement.');
    }
  }

  module.exports = { getFarmers, registerFarmer, getLedger, downloadStatement, downloadStatementPdf, loginMpin, resetMpin };
