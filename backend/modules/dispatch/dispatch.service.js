const crypto = require('crypto');
const dispatchRepo = require('./dispatch.repository');
const { createAppNotification } = require('../../shared/notifications/notifications');

// ─── MPIN Utilities ───────────────────────────────────────────────

function hashMpin(mpin) {
  if (!mpin) return '';
  return crypto.createHash('sha256').update(mpin.toString()).digest('hex');
}

function verifyMpin(mpin, storedHash) {
  if (!storedHash) return false;
  if (!mpin) return false;
  // Legacy plain-text MPINs (non-64-char hashes)
  if (storedHash.length !== 64) {
    return storedHash.toString() === mpin.toString();
  }
  return hashMpin(mpin) === storedHash;
}

// ─── Service Methods ──────────────────────────────────────────────

/**
 * Fetch dispatches for a farmer or cold storage.
 * @param {{ farmerId?: string, coldStorageId?: string }} filter
 */
async function fetchDispatches(filter) {
  return dispatchRepo.getDispatchesData(filter);
}

/**
 * Create a new dispatch request.
 * Calculates weight, finds active lot, verifies cold storage,
 * inserts record, and sends notification.
 */
async function createNewDispatch(data) {
  const { farmerId, coldStorageId, commodity, bags, vehicleNumber } = data;

  // Weight calculation: 1 packet = 0.5 Qtl
  const weightQtl = parseFloat(bags) * 0.5;

  // Validate pre-requisites: active lot must exist
  const lotId = await dispatchRepo.getActiveLotForDispatch(farmerId, commodity);
  if (!lotId) {
    const err = new Error('No active stock lots found in the database. Please create an inward stock booking first.');
    err.statusCode = 400;
    throw err;
  }

  // Verify cold storage exists (or fallback)
  const verifiedColdStorageId = await dispatchRepo.verifyColdStorage(coldStorageId);

  const id = 'NK-' + Date.now();
  const nikasiNumber = 'NK-' + Math.floor(10000 + Math.random() * 90000);

  const dispatch = await dispatchRepo.insertDispatch({
    id, nikasiNumber, farmerId,
    coldStorageId: verifiedColdStorageId,
    lotId, bags, weightQtl, commodity, vehicleNumber
  });

  // Integrated notification — farmer must authorize via MPIN
  try {
    const csName = await dispatchRepo.getColdStorageName(verifiedColdStorageId);
    await createAppNotification({
      coldStorageId: verifiedColdStorageId,
      userId: farmerId,
      lotId: null,
      type: 'warning',
      title: 'Dispatch Approval Required',
      message: `Request to dispatch ${bags} bags of ${commodity} from ${csName} is pending. Please authorize via MPIN.`,
      icon: 'lock',
      actionUrl: '/dispatch'
    });
  } catch (notifErr) {
    console.warn('Failed to create dispatch notification:', notifErr.message);
  }

  return dispatch;
}

/**
 * Approve a dispatch via farmer MPIN authorization.
 * Verifies MPIN, updates status to IN_TRANSIT, cleans up old notification,
 * and creates new approval notifications.
 */
async function approveDispatchByMpin(id, mpin) {
  // 1. Get the dispatch
  const dispatchData = await dispatchRepo.getDispatchById(id);
  if (!dispatchData) {
    const err = new Error('Dispatch transaction not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Fetch farmer and verify MPIN
  const farmer = await dispatchRepo.getFarmerWithMpin(dispatchData.farmerId);
  if (!farmer) {
    const err = new Error('Associated farmer profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const farmerMpin = farmer.mpin || '1234';
  if (!verifyMpin(mpin, farmerMpin)) {
    const err = new Error('Invalid MPIN. Please try again.');
    err.statusCode = 401;
    throw err;
  }

  // 3. Update status to IN_TRANSIT
  const updatedDispatch = await dispatchRepo.updateDispatchStatus(id, 'IN_TRANSIT');

  // 4. Clean up the pending approval notification
  try {
    await dispatchRepo.deleteNotification(
      dispatchData.farmerId,
      'Dispatch Approval Required',
      `%dispatch ${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish}%`
    );
    console.log(`[Notification Cleanup] Deleted pending dispatch notification for farmer ${dispatchData.farmerId}`);
  } catch (cleanErr) {
    console.warn('Failed to delete pending dispatch notification:', cleanErr.message);
  }

  // 5. Create approval notifications (vendor + cold storage)
  try {
    const farmerName = farmer.name || 'Farmer';
    const csId = dispatchData.coldStorageId || 'cmmp9txv0000ai3t4wush9trs';

    // Notification to vendor
    await createAppNotification({
      coldStorageId: csId,
      userId: 'default_vendor',
      lotId: null,
      type: 'info',
      title: 'Dispatch Approved by Farmer',
      message: `${farmerName} authorized dispatch of ${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish || 'goods'} via MPIN.`,
      icon: 'check',
      actionUrl: null
    });

    // Notification to cold storage
    await createAppNotification({
      coldStorageId: csId,
      userId: csId,
      lotId: null,
      type: 'info',
      title: 'Dispatch Approved by Farmer',
      message: `${farmerName} authorized dispatch of ${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish || 'goods'} via MPIN. Ready for transport/delivery.`,
      icon: 'check',
      actionUrl: null
    });
  } catch (notifErr) {
    console.warn('Failed to create approval notifications:', notifErr.message);
  }

  return updatedDispatch;
}

/**
 * Mark a dispatch as delivered.
 * Updates status to DISPATCHED, cleans up cold storage notification,
 * and sends delivery notification to farmer.
 */
async function markDispatchDelivered(id) {
  const updatedDispatch = await dispatchRepo.updateDispatchStatus(id, 'DISPATCHED');
  if (!updatedDispatch) {
    const err = new Error('Dispatch transaction not found');
    err.statusCode = 404;
    throw err;
  }

  // Clean up cold storage's approval notification
  try {
    await dispatchRepo.deleteNotification(
      updatedDispatch.coldStorageId,
      'Dispatch Approved by Farmer',
      `%dispatch of ${updatedDispatch.packetsDispatched} bags%`
    );
    console.log(`[Notification Cleanup] Deleted dispatch approved notification for cold storage ${updatedDispatch.coldStorageId}`);
  } catch (cleanErr) {
    console.warn('Failed to delete cold storage notification:', cleanErr.message);
  }

  // Send delivery notification to farmer
  try {
    const csName = await dispatchRepo.getColdStorageName(updatedDispatch.coldStorageId);
    await createAppNotification({
      coldStorageId: updatedDispatch.coldStorageId || 'cmmp9txv0000ai3t4wush9trs',
      userId: updatedDispatch.farmerId,
      lotId: null,
      type: 'info',
      title: 'Dispatch Delivered',
      message: `${updatedDispatch.packetsDispatched} bags of ${updatedDispatch.remarkEnglish || 'goods'} have been successfully delivered/dispatched from ${csName}.`,
      icon: 'check',
      actionUrl: '/dispatch'
    });
  } catch (notifErr) {
    console.warn('Failed to create delivery notification:', notifErr.message);
  }

  return updatedDispatch;
}

module.exports = {
  fetchDispatches,
  createNewDispatch,
  approveDispatchByMpin,
  markDispatchDelivered
};
