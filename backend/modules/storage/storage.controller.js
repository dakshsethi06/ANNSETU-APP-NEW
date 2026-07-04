const storageRepository = require('./storage.repository');
const crypto = require('crypto');

async function getColdStorages(req, res) {
  try {
    const coldStorages = await storageRepository.getColdStorages();
    return res.json({ success: true, coldStorages });
  } catch (error) {
    console.error('PostgreSQL cold-storages GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch cold storages from database' });
  }
}

async function registerColdStorage(req, res) {
  const { id, displayName, city, district, state, address, contactPerson, phone, mpin } = req.body;
  if (!id || !displayName) return res.status(400).json({ success: false, error: 'id and displayName are required fields' });

  try {
    const finalCity = city || 'Tundla';
    const finalDistrict = district || 'Firozabad';
    const finalState = state || 'Uttar Pradesh';
    const finalAddress = address || `${finalCity}, ${finalDistrict}`;
    const now = new Date();
    const storageCode = 'CS-' + id.substring(0, 6).toUpperCase();
    const hashedMpin = crypto.createHash('sha256').update((mpin || '1111').toString()).digest('hex');

    const params = [
      id, storageCode, displayName, displayName, contactPerson || 'Manager', phone || '9999999999', 'contact@' + id + '.com',
      finalCity, finalDistrict, finalState, finalAddress, 5000.0, 10, 'APPROVED', now, now, now, now, true, now, 'Onboarding Consent', 'v1.0',
      hashedMpin
    ];
    
    await storageRepository.createColdStorage(params);
    return res.status(201).json({ success: true, coldStorage: { id, name: displayName, city: finalCity, district: finalDistrict, state: finalState, address: finalAddress } });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, error: `Cold Storage with ID ${id} already exists` });
    return res.status(500).json({ success: false, error: error.message || 'Failed to register cold storage in database' });
  }
}

async function getSummary(req, res) {
  try {
    const coldStorageId = req.query.coldStorageId || 'cmmp9txv0000ai3t4wush9trs';
    const data = await storageRepository.getStorageSummaryData(coldStorageId);
    if (!data) return res.status(404).json({ success: false, error: 'Cold storage not found.' });

    const { cs, stock, dues, today, activity } = data;
    return res.json({
      success: true,
      summary: {
        coldStorage: { id: cs.id, name: cs.displayName, location: `${cs.city}, ${cs.district}, ${cs.state}`, city: cs.city, district: cs.district, state: cs.state },
        stock: { packets: parseInt(stock.active_packets || 0, 10), weightMt: parseFloat(stock.active_weight || 0) * 0.1, totalPackets: parseInt(stock.total_packets || 0, 10), totalWeightMt: parseFloat(stock.total_weight || 0) * 0.1 },
        dues: { amount: parseFloat(dues.total_dues || 0), farmersCount: parseInt(dues.farmers_count || 0, 10) },
        todayAmad: { entries: parseInt(today.entries_count || 0, 10), packets: parseInt(today.packets_count || 0, 10) },
        recentActivity: activity.map(row => {
          const age_days = Math.floor(Math.abs(new Date() - new Date(row.amadDate)) / (1000 * 60 * 60 * 24)) || 0;
          return { id: row.id, commodity: row.commodity, variety: row.kism || '-', room: row.roomId || '-', rack: row.rackId || '-', bags: row.packets, weightMt: parseFloat(row.weightQtl || 0) * 0.1, ageDays: age_days, status: row.status || 'Good' };
        })
      }
    });
  } catch (error) { return res.status(500).json({ success: false, error: 'Failed to fetch cold storage summary' }); }
}

module.exports = { getColdStorages, registerColdStorage, getSummary };
