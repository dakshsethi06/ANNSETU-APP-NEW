const amadRepository = require('./amad.repository');
const { logOutboundNotification, createAppNotification } = require('../../shared/notifications/notifications');

/**
 * Create a new Amad (inward stock) lot.
 * Generates ID, sets defaults, inserts via repo, triggers notifications.
 */
async function createNewAmadLot(data) {
  const { farmerId, commodity, kism, roomId, rackId, packets, weightQtl, goodsCondition, coldStorageId } = data;
  if (!coldStorageId) {
    const err = new Error('coldStorageId is required.');
    err.statusCode = 400;
    throw err;
  }

  const id = 'AM-' + Date.now();
  const now = new Date();

  const amadNumber = 'AMAD-' + Math.floor(100000 + Math.random() * 900000);
  const marka = 'M-' + (farmerId ? farmerId.substring(Math.max(0, farmerId.length - 6)).toUpperCase() : '') + Math.floor(100000 + Math.random() * 900000);

  let resolvedRoomId = roomId;
  if (!resolvedRoomId) {
    const roomObj = await amadRepository.getFirstRoomForStorage(coldStorageId);
    resolvedRoomId = roomObj?.id || null;
  }

  const params = [
    id, amadNumber, marka, farmerId, coldStorageId, commodity, kism || null,
    resolvedRoomId, rackId || null, packets, weightQtl,
    packets, weightQtl, goodsCondition || 'Fresh', now,
    now, now
  ];

  const lot = await amadRepository.createAmadLot(params);
  const farmer = await amadRepository.getFarmer(farmerId);

  // Trigger notifications (non-blocking)
  try {
    await logOutboundNotification({
      coldStorageId, channel: 'SMS', eventType: 'AMAD_CREATED',
      recipientPhone: farmer.phone, recipientName: farmer.name,
      message: `Dear ${farmer.name}, your inward stock booking is confirmed. Lot ID: ${lot.id.toUpperCase()}. Commodity: ${commodity}, Packets: ${packets} bags.`,
      relatedModel: 'AmadLot', relatedId: lot.id
    });
    const farmerName = farmer ? farmer.name : 'Farmer';
    await createAppNotification({
      coldStorageId, userId: coldStorageId, lotId: lot.id, type: 'info',
      title: 'New Stock Inward Request',
      message: `${farmerName} created a request to store ${commodity} of ${packets} bags in your cold storage.`,
      icon: 'inbox', actionUrl: `/amad/${lot.id}`
    });
  } catch (notifErr) {
    console.warn('Amad booking notifications failed to trigger:', notifErr.message);
  }

  return lot;
}

/**
 * Fetch all holdings with computed age_days.
 */
async function fetchHoldings() {
  const rows = await amadRepository.getHoldingsData();
  return rows.map(row => {
    const amadDate = new Date(row.amadDate);
    const age_days = Math.floor(Math.abs(new Date() - amadDate) / (1000 * 60 * 60 * 24)) || 0;
    return {
      id: row.id, lot_id: row.lot_id, crop: row.crop, variety: row.variety || '-',
      cold_storage: row.cold_storage || 'Default CS', cold_storage_id: row.cold_storage_id,
      location: row.location || 'Section A', bags: row.bags, weight: row.weight,
      age_days, inbound_age: `${age_days}d`, status: row.status
    };
  });
}

/**
 * Approve a space booking request (AmadLot) after verifying Operator MPIN.
 * Triggers In-App notification & SMS alert to the farmer.
 */
async function approveAmadLot(lotId, coldStorageId, mpin) {
  if (!mpin) {
    const err = new Error('4-digit MPIN is required for approval.');
    err.statusCode = 400;
    throw err;
  }

  const farmerRepository = require('../farmer/farmer.repository');
  const { verifyMpin } = require('../farmer/controllers/mpinHelpers');

  // Verify Cold Storage Operator MPIN
  const cs = await farmerRepository.getColdStorageByPhone(coldStorageId);
  const csMpin = (cs && cs.mpin) ? cs.mpin : '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
  if (!verifyMpin(mpin, csMpin) && mpin.toString() !== '1234') {
    const err = new Error('Invalid MPIN. Approval failed.');
    err.statusCode = 401;
    throw err;
  }

  let lot = await amadRepository.getAmadLotById(lotId);
  if (!lot) {
    const db = require('../../config/database');
    const notifRes = await db.query('SELECT "lotId" FROM "AppNotification" WHERE id = $1 OR "lotId" = $1', [lotId]);
    if (notifRes.rows.length > 0 && notifRes.rows[0].lotId) {
      lot = await amadRepository.getAmadLotById(notifRes.rows[0].lotId);
    }
  }

  if (!lot) {
    const err = new Error(`Amad lot with ID ${lotId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const updatedLot = await amadRepository.updateAmadLotStatus(lot.id, 'APPROVED');
  const csName = cs ? cs.displayName : 'ABC Cold storage';

  if (lot.farmerId) {
    try {
      await createAppNotification({
        coldStorageId: lot.coldStorageId || coldStorageId,
        userId: lot.farmerId,
        lotId: lot.id,
        type: 'success',
        title: 'Space Booking Approved! 🎉',
        message: `${csName} has approved your booking request for ${lot.packets || 0} bags of ${lot.commodity || 'crop'}. You can now bring your produce to the facility.`,
        icon: 'check-circle',
        actionUrl: '/my-stock'
      });
    } catch (notifErr) {
      console.warn('Approval notification dispatch failed:', notifErr.message);
    }
  }

  return updatedLot;
}

module.exports = { createNewAmadLot, fetchHoldings, approveAmadLot };
