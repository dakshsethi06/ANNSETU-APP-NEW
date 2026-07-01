const amadRepository = require('../repositories/amadRepository');

async function createAmad(req, res) {
  const { farmerId, commodity, kism, roomId, rackId, packets, weightQtl, goodsCondition } = req.body;
  if (!farmerId || !commodity || !packets || !weightQtl) {
    return res.status(400).json({ success: false, error: 'farmerId, commodity, packets, and weightQtl are required fields.' });
  }

  try {
    const id = 'AM-' + Date.now();
    const now = new Date();
    const coldStorageId = 'cmmp9txv0000ai3t4wush9trs'; 
    const params = [ id, farmerId, coldStorageId, commodity, kism || null, roomId || null, rackId || null, packets, weightQtl, packets, weightQtl, goodsCondition || 'Fresh', now ];
    const lot = await amadRepository.createAmadLot(params);
    const farmer = await amadRepository.getFarmer(farmerId);

    try {
      const { logOutboundNotification, createAppNotification } = require('../lib/notifications');
      await logOutboundNotification({
        coldStorageId, channel: 'SMS', eventType: 'AMAD_CREATED', recipientPhone: farmer.phone, recipientName: farmer.name,
        message: `Dear ${farmer.name}, your inward stock booking is confirmed. Lot ID: ${lot.id.toUpperCase()}. Commodity: ${commodity}, Packets: ${packets} bags.`,
        relatedModel: 'AmadLot', relatedId: lot.id
      });
      await createAppNotification({
        coldStorageId, userId: farmerId, lotId: lot.id, type: 'info', title: 'New Stock Inward',
        message: `Your stock of ${packets} bags of ${commodity} has been stored successfully in Room ${roomId || '-'}.`, icon: 'inbox', actionUrl: `/inventory`
      });
    } catch (notifErr) { console.warn('Amad booking notifications failed to trigger:', notifErr.message); }

    return res.status(201).json({ success: true, lot });
  } catch (error) {
    console.error('PostgreSQL Amad POST error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to register Amad lot in database' });
  }
}

async function getHoldings(req, res) {
  try {
    const rows = await amadRepository.getHoldingsData();
    const holdings = rows.map(row => {
      const amadDate = new Date(row.amadDate);
      const age_days = Math.floor(Math.abs(new Date() - amadDate) / (1000 * 60 * 60 * 24)) || 0;
      return {
        id: row.id, lot_id: row.lot_id, crop: row.crop, variety: row.variety || '-',
        cold_storage: row.cold_storage || 'Default CS', cold_storage_id: row.cold_storage_id, location: row.location || 'Section A',
        bags: row.bags, weight: row.weight, age_days: age_days, inbound_age: `${age_days}d`, status: row.status
      };
    });
    return res.json({ success: true, holdings });
  } catch (error) {
    console.error('PostgreSQL holdings GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch holdings from database' });
  }
}

module.exports = { createAmad, getHoldings };
