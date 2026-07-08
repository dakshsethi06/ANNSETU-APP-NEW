const db = require('../../config/database');
const farmerRepository = require('./farmer.repository');
const pdfService = require('./pdf.service');
const { logOutboundNotification, createAppNotification } = require('../../shared/notifications/notifications');
const { hashMpin, verifyMpin } = require('../../shared/utils/mpinUtils');

// ─── Service Methods ──────────────────────────────────────────────

/**
 * Fetch farmers with optional filtering.
 */
async function fetchFarmers(state, serial_number) {
  return farmerRepository.getFarmersData(state, serial_number);
}

/**
 * Register a new farmer.
 * Hashes MPIN, inserts via repo, triggers notifications.
 */
async function registerNewFarmer(data) {
  const { serial_number, name, state, commodity, phone, fatherName, village, district, tehsil, mpin, coldStorageId } = data;
  if (!coldStorageId) {
    throw new Error('coldStorageId is required for registering a new farmer.');
  }

  const finalState = state || 'Rajasthan';
  const finalCommodity = commodity || 'Potato';
  const now = new Date();
  const hashedMpin = hashMpin(mpin || '1234');

  const params = [
    serial_number, 'CS-' + serial_number, name, finalState, finalCommodity,
    true, 0.0, 10000.0, 0.0, false,
    now, true, now, now, coldStorageId, true,
    phone || null, fatherName || null, village || null, district || null, tehsil || null,
    hashedMpin
  ];

  await farmerRepository.createFarmerRecord(params);

  // Trigger notifications (non-blocking)
  try {
    await logOutboundNotification({
      coldStorageId: coldStorageId, channel: 'SMS', eventType: 'FARMER_REGISTERED',
      recipientPhone: phone || null, recipientName: name,
      message: `Welcome ${name}! Your farmer account at SN Sharma Cold Storage has been registered. Account Number: CS-${serial_number}.`,
      relatedModel: 'Farmer', relatedId: serial_number
    });
    await createAppNotification({
      coldStorageId: coldStorageId, userId: serial_number, type: 'info',
      title: 'Welcome to Annsetu',
      message: `Welcome ${name}! Your account has been registered successfully.`,
      icon: 'info'
    });
  } catch (notifErr) {
    console.warn('Welcome notifications failed to trigger:', notifErr.message);
  }

  return {
    serial_number, name, state: finalState, commodity: finalCommodity,
    phone: phone || null, fatherName: fatherName || null,
    village: village || null, district: district || null, tehsil: tehsil || null
  };
}

/**
 * Fetch farmer ledger.
 */
async function fetchLedger(farmerId) {
  return farmerRepository.getFarmerLedger(farmerId);
}

/**
 * Login via MPIN — checks Cold Storage first, then Farmer.
 */
async function loginWithMpin(phone, mpin) {
  // 1. Check if phone belongs to a Cold Storage Facility
  const csRes = await db.query('SELECT id, "displayName", mpin FROM "ColdStorageOnboarding" WHERE phone = $1', [phone]);
  if (csRes.rows.length > 0) {
    const cs = csRes.rows[0];
    const csMpin = cs.mpin || '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c';
    if (!verifyMpin(mpin, csMpin)) {
      const err = new Error('Invalid MPIN for Cold Storage. Please try again.');
      err.statusCode = 401;
      throw err;
    }
    return {
      role: 'ColdStorageFacility',
      coldStorage: { id: cs.id, name: cs.displayName, phone }
    };
  }

  // 2. Farmer login
  const farmer = await farmerRepository.getFarmerByPhone(phone);
  if (!farmer) {
    const err = new Error('Farmer profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const farmerMpin = farmer.mpin || '1234';
  if (!verifyMpin(mpin, farmerMpin)) {
    const err = new Error('Invalid MPIN. Please try again.');
    err.statusCode = 401;
    throw err;
  }

  return {
    role: 'ColdStorage',
    farmer: { id: farmer.id, name: farmer.name, phone: farmer.phone, state: farmer.state }
  };
}

/**
 * Reset MPIN for a farmer or cold storage.
 */
async function resetUserMpin(phone, otp, newMpin) {
  if (otp !== '1234') {
    const err = new Error('Invalid verification OTP.');
    err.statusCode = 400;
    throw err;
  }
  if (newMpin.length < 4) {
    const err = new Error('New MPIN must be at least 4 digits.');
    err.statusCode = 400;
    throw err;
  }

  const cleanPhone = phone.replace('+91', '').trim();
  const hashedMpin = hashMpin(newMpin);

  // Check if cold storage first
  const csRes = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE phone = $1', [cleanPhone]);
  if (csRes.rows.length > 0) {
    await db.query(
      `UPDATE "ColdStorageOnboarding" SET "mpin" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      [hashedMpin, csRes.rows[0].id]
    );
    return;
  }

  // Farmer reset
  const farmer = await farmerRepository.getFarmerByPhone(phone);
  if (!farmer) {
    const err = new Error('Farmer profile not found.');
    err.statusCode = 404;
    throw err;
  }

  await db.query(
    `UPDATE "Farmer" SET "mpin" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
    [hashedMpin, farmer.id]
  );
}

/**
 * Generate CSV statement content for a farmer.
 */
async function generateStatement(farmerId) {
  const farmerRes = await db.query('SELECT name, phone, "openingBalance" FROM "Farmer" WHERE id = $1', [farmerId]);
  if (farmerRes.rows.length === 0) {
    const err = new Error('Farmer profile not found.');
    err.statusCode = 404;
    throw err;
  }
  const farmer = farmerRes.rows[0];
  const ledger = await farmerRepository.getFarmerLedger(farmerId);

  let csv = `Annsetu Farmer Account Statement\n`;
  csv += `Farmer Name,${farmer.name}\n`;
  csv += `Phone,${farmer.phone}\n`;
  csv += `Opening Balance,₹${parseFloat(farmer.openingBalance || 0).toFixed(2)}\n\n`;
  csv += `Date,Description,Amount (₹),Balance (₹)\n`;

  const chronological = [...ledger].reverse();
  chronological.forEach(item => {
    const formattedDate = new Date(item.date).toLocaleDateString('en-IN');
    const amountStr = item.amount < 0
      ? `-${Math.abs(item.amount).toFixed(2)}`
      : `+${Math.abs(item.amount).toFixed(2)}`;
    csv += `"${formattedDate}","${item.title.replace(/"/g, '""')}",${amountStr},${item.balance.toFixed(2)}\n`;
  });

  return { csv, farmerName: farmer.name };
}

/**
 * Generate PDF statement for a farmer.
 */
async function generateStatementPdf(farmerId, res) {
  const farmerRes = await db.query('SELECT * FROM "Farmer" WHERE id = $1', [farmerId]);
  if (farmerRes.rows.length === 0) {
    const err = new Error('Farmer profile not found.');
    err.statusCode = 404;
    throw err;
  }
  const farmer = farmerRes.rows[0];

  const csRes = await db.query(
    'SELECT "displayName", address, phone FROM "ColdStorageOnboarding" WHERE id = $1',
    [farmer.coldStorageId]
  );
  const coldStorage = csRes.rows.length > 0
    ? csRes.rows[0]
    : { displayName: 'Annsetu Cold Storage', address: 'Tundla', phone: '9999999999' };

  const coldStorageDetails = {
    name: coldStorage.displayName,
    address: coldStorage.address,
    phone: coldStorage.phone
  };

  const ledger = await farmerRepository.getFarmerLedger(farmerId);
  const paymentsRes = await db.query(
    'SELECT * FROM "Payment" WHERE "farmerId" = $1 ORDER BY "createdAt" DESC',
    [farmerId]
  );

  const totalCharged = ledger.reduce((sum, item) => item.amount < 0 ? sum + Math.abs(item.amount) : sum, 0);
  const totalPaid = ledger.reduce((sum, item) => item.amount > 0 ? sum + item.amount : sum, 0);
  const pendingRent = parseFloat(farmer.pendingRent || 0);

  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let periodStr = '';
  if (ledger.length > 0) {
    const oldestDate = new Date(ledger[ledger.length - 1].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const newestDate = new Date(ledger[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    periodStr = `${oldestDate} - ${newestDate}`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Khata_Statement_${todayStr}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  pdfService.buildStatementPdf(res, {
    farmer,
    coldStorage: coldStorageDetails,
    ledger,
    payments: paymentsRes.rows,
    summary: { totalCharged, totalPaid, netPayable: pendingRent },
    currentDateStr,
    periodStr
  });
}

module.exports = {
  fetchFarmers,
  registerNewFarmer,
  fetchLedger,
  loginWithMpin,
  resetUserMpin,
  generateStatement,
  generateStatementPdf
};
