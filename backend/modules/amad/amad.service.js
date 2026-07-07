const amadRepository = require('./amad.repository');
const { logOutboundNotification, createAppNotification } = require('../../shared/notifications/notifications');

/**
 * Create a new Amad (inward stock) lot.
 * Generates ID, sets defaults, inserts via repo, triggers notifications.
 */
async function createNewAmadLot(data) {
  const { farmerId, commodity, kism, roomId, rackId, packets, weightQtl, goodsCondition } = data;

  const id = 'AM-' + Date.now();
  const now = new Date();
  const coldStorageId = 'cmmp9txv0000ai3t4wush9trs';

  const params = [
    id, farmerId, coldStorageId, commodity, kism || null,
    roomId || null, rackId || null, packets, weightQtl,
    packets, weightQtl, goodsCondition || 'Fresh', now
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
    await createAppNotification({
      coldStorageId, userId: farmerId, lotId: lot.id, type: 'info',
      title: 'New Stock Inward',
      message: `Your stock of ${packets} bags of ${commodity} has been stored successfully in Room ${roomId || '-'}.`,
      icon: 'inbox', actionUrl: '/inventory'
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

module.exports = { createNewAmadLot, fetchHoldings };
