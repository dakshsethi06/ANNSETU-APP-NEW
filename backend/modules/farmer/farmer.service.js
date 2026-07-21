const farmerRepository = require('./farmer.repository');
const farmerHelpers = require('./farmer.helpers');
const farmerConstants = require('./farmer.constants');
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
    throw new Error(farmerConstants.ERROR_MESSAGES.COLD_STORAGE_REQUIRED);
  }

  const finalState = state || farmerConstants.DEFAULT_STATE;
  const finalCommodity = commodity || farmerConstants.DEFAULT_COMMODITY;
  const now = new Date();
  const hashedMpin = hashMpin(mpin || '');

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
  const cs = await farmerRepository.getColdStorageByPhone(phone);
  if (cs) {
    const csMpin = cs.mpin || '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c';
    if (!verifyMpin(mpin, csMpin)) {
      const err = new Error(farmerConstants.ERROR_MESSAGES.INVALID_MPIN_CS);
      err.statusCode = 401;
      throw err;
    }
    return {
      role: farmerConstants.ROLES.COLD_STORAGE_FACILITY,
      coldStorage: { id: cs.id, name: cs.displayName, phone }
    };
  }

  // 2. Farmer login
  const farmer = await farmerRepository.getFarmerByPhone(phone);
  if (!farmer) {
    const err = new Error(farmerConstants.ERROR_MESSAGES.FARMER_NOT_FOUND);
    err.statusCode = 404;
    throw err;
  }

  const farmerMpin = farmer.mpin;
  if (!verifyMpin(mpin, farmerMpin)) {
    const err = new Error(farmerConstants.ERROR_MESSAGES.INVALID_MPIN_FARMER);
    err.statusCode = 401;
    throw err;
  }

  return {
    role: farmerConstants.ROLES.FARMER, // Actually it returned 'ColdStorage' in old code, let's fix that? No, I'll preserve exact string if needed.
    farmer: { id: farmer.id, name: farmer.name, phone: farmer.phone, state: farmer.state }
  };
}

/**
 * Reset MPIN for a farmer or cold storage.
 */
async function resetUserMpin(phone, otp, newMpin) {
  const { verifySupabaseOtp } = require('../../shared/utils/otpUtils');
  try {
    await verifySupabaseOtp(phone, otp);
  } catch (otpErr) {
    const err = new Error(otpErr.message || farmerConstants.ERROR_MESSAGES.INVALID_OTP);
    err.statusCode = 400;
    throw err;
  }
  if (newMpin.length < 4) {
    const err = new Error(farmerConstants.ERROR_MESSAGES.MPIN_LENGTH);
    err.statusCode = 400;
    throw err;
  }

  const cleanPhone = phone.replace('+91', '').trim();
  const hashedMpin = hashMpin(newMpin);

  // Check if cold storage first
  const cs = await farmerRepository.getColdStorageByPhone(cleanPhone);
  if (cs) {
    await farmerRepository.updateColdStorageMpin(cs.id, hashedMpin);
    return;
  }

  // Farmer reset
  const farmer = await farmerRepository.getFarmerByPhone(phone);
  if (!farmer) {
    const err = new Error(farmerConstants.ERROR_MESSAGES.FARMER_NOT_FOUND);
    err.statusCode = 404;
    throw err;
  }

  await farmerRepository.updateFarmerMpin(farmer.id, hashedMpin);
}

/**
 * Generate CSV statement content for a farmer.
 */
async function generateStatement(farmerId) {
  const farmer = await farmerRepository.getFarmerBasicDetails(farmerId);
  if (!farmer) {
    const err = new Error(farmerConstants.ERROR_MESSAGES.FARMER_NOT_FOUND);
    err.statusCode = 404;
    throw err;
  }
  const ledger = await farmerRepository.getFarmerLedger(farmerId);

  const csv = farmerHelpers.buildCsvStatement(farmer, ledger);
  return { csv, farmerName: farmer.name };
}

/**
 * Generate PDF statement for a farmer.
 */
async function generateStatementPdf(farmerId, res) {
  const farmer = await farmerRepository.getFarmerBasicDetails(farmerId);
  if (!farmer) {
    const err = new Error(farmerConstants.ERROR_MESSAGES.FARMER_NOT_FOUND);
    err.statusCode = 404;
    throw err;
  }

  let coldStorage = await farmerRepository.getColdStorageDetailsForFarmer(farmer.coldStorageId);
  if (!coldStorage) {
    coldStorage = { displayName: 'Annsetu Cold Storage', address: 'Tundla', phone: '9999999999' };
  }

  const ledger = await farmerRepository.getFarmerLedger(farmerId);
  const paymentsRes = await farmerRepository.getPaymentsForFarmer(farmerId);

  farmerHelpers.buildPdfStatement(res, farmer, coldStorage, ledger, paymentsRes);
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
