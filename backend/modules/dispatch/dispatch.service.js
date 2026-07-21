const dispatchRepo = require('./dispatch.repository');
const { createAppNotification } = require('../../shared/notifications/notifications');
const { DEFAULT_COLD_STORAGE_ID } = require('../../config/constants');
const { hashMpin, verifyMpin } = require('../../shared/utils/mpinUtils');
const crypto = require('crypto');

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
  const weightQtl = Number.parseFloat(bags) * 0.5;

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
  const nikasiNumber = 'NK-' + crypto.randomInt(10000, 100000);

  const dispatch = await dispatchRepo.insertDispatch({
    id, nikasiNumber, farmerId,
    coldStorageId: verifiedColdStorageId,
    lotId, bags, weightQtl, commodity, vehicleNumber
  });

  // Integrated notification — sent to Cold Storage when dispatch is requested
  try {
    const farmer = await dispatchRepo.getFarmerWithMpin(farmerId);
    const farmerName = farmer?.name || 'Farmer';
    await createAppNotification({
      coldStorageId: verifiedColdStorageId,
      userId: verifiedColdStorageId,
      lotId: dispatch.id,
      type: 'warning',
      title: 'New Dispatch Request',
      message: `Farmer ${farmerName} requested a dispatch of ${bags} bags of ${commodity}. Please authorize via MPIN.`,
      icon: 'truck',
      actionUrl: `/dispatch/${dispatch.id}`
    });
  } catch (notifErr) {
    console.warn('Failed to create dispatch notification:', notifErr.message);
  }

  return dispatch;
}

/**
 * Approve a dispatch via MPIN authorization.
 * Verifies MPIN (Cold Storage or Farmer), updates status to IN_TRANSIT, cleans up old notification,
 * and creates approval notification for the farmer.
 */
async function approveDispatchByMpin(id, mpin) {
  // 1. Get the dispatch
  const dispatchData = await dispatchRepo.getDispatchById(id);
  if (!dispatchData) {
    const err = new Error('Dispatch transaction not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Fetch profiles & verify MPIN (Cold Storage preferred, fallback to Farmer)
  let authorized = false;
  const coldStorage = await dispatchRepo.getColdStorageWithMpin(dispatchData.coldStorageId);
  if (coldStorage && coldStorage.mpin) {
    if (verifyMpin(mpin, coldStorage.mpin)) {
      authorized = true;
    }
  }

  const farmer = await dispatchRepo.getFarmerWithMpin(dispatchData.farmerId);
  if (!authorized && farmer && farmer.mpin) {
    if (verifyMpin(mpin, farmer.mpin)) {
      authorized = true;
    }
  }

  if (!authorized) {
    const err = new Error('Invalid MPIN. Please try again.');
    err.statusCode = 401;
    throw err;
  }

  // 3. Update status to IN_TRANSIT
  const updatedDispatch = await dispatchRepo.updateDispatchStatus(id, 'IN_TRANSIT');

  // 4. Clean up the pending approval notification
  try {
    await dispatchRepo.deleteNotification(
      dispatchData.coldStorageId,
      'New Dispatch Request',
      `%${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish}%`
    );
    await dispatchRepo.deleteNotification(
      dispatchData.farmerId,
      'Dispatch Approval Required',
      `%dispatch ${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish}%`
    );
    console.log(`[Notification Cleanup] Deleted pending dispatch notification for dispatch ${id}`);
  } catch (cleanErr) {
    console.warn('Failed to delete pending dispatch notification:', cleanErr.message);
  }

  // 5. Create approval notification for the farmer
  try {
    const csId = dispatchData.coldStorageId || DEFAULT_COLD_STORAGE_ID;

    // Notification to farmer
    await createAppNotification({
      coldStorageId: csId,
      userId: dispatchData.farmerId,
      lotId: null,
      type: 'info',
      title: 'Dispatch Approved',
      message: `Your dispatch request of ${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish || 'goods'} has been approved by Cold Storage.`,
      icon: 'check',
      actionUrl: '/dispatch'
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
      coldStorageId: updatedDispatch.coldStorageId || DEFAULT_COLD_STORAGE_ID,
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
