const crypto = require('crypto');
const storageRepository = require('./storage.repository');

/**
 * Fetch all cold storages.
 */
async function fetchColdStorages() {
  return storageRepository.getColdStorages();
}

/**
 * Register a new cold storage facility.
 * Generates defaults, hashes MPIN, and inserts via repo.
 */
async function registerNewColdStorage(data) {
  const { id, displayName, city, district, state, address, contactPerson, phone, mpin } = data;

  const finalCity = city || 'Tundla';
  const finalDistrict = district || 'Firozabad';
  const finalState = state || 'Uttar Pradesh';
  const finalAddress = address || `${finalCity}, ${finalDistrict}`;
  const now = new Date();
  const storageCode = 'CS-' + id.substring(0, 6).toUpperCase();
  const hashedMpin = crypto.createHash('sha256').update((mpin || '1111').toString()).digest('hex');

  const params = [
    id, storageCode, displayName, displayName, contactPerson || 'Manager',
    phone || '9999999999', 'contact@' + id + '.com',
    finalCity, finalDistrict, finalState, finalAddress,
    5000.0, 10, 'APPROVED', now, now, now, now, true, now, 'Onboarding Consent', 'v1.0',
    hashedMpin
  ];

  await storageRepository.createColdStorage(params);

  return {
    id, name: displayName,
    city: finalCity, district: finalDistrict,
    state: finalState, address: finalAddress
  };
}

/**
 * Fetch cold storage summary with formatted response.
 */
async function fetchStorageSummary(coldStorageId) {
  const resolvedId = coldStorageId || 'cmmp9txv0000ai3t4wush9trs';
  const data = await storageRepository.getStorageSummaryData(resolvedId);

  if (!data) return null;

  const { cs, stock, dues, today, activity } = data;

  return {
    coldStorage: {
      id: cs.id, name: cs.displayName,
      location: `${cs.city}, ${cs.district}, ${cs.state}`,
      city: cs.city, district: cs.district, state: cs.state
    },
    stock: {
      packets: parseInt(stock.active_packets || 0, 10),
      weightMt: parseFloat(stock.active_weight || 0) * 0.1,
      totalPackets: parseInt(stock.total_packets || 0, 10),
      totalWeightMt: parseFloat(stock.total_weight || 0) * 0.1
    },
    dues: {
      amount: parseFloat(dues.total_dues || 0),
      farmersCount: parseInt(dues.farmers_count || 0, 10)
    },
    todayAmad: {
      entries: parseInt(today.entries_count || 0, 10),
      packets: parseInt(today.packets_count || 0, 10)
    },
    recentActivity: activity.map(row => {
      const age_days = Math.floor(Math.abs(new Date() - new Date(row.amadDate)) / (1000 * 60 * 60 * 24)) || 0;
      return {
        id: row.id, commodity: row.commodity, variety: row.kism || '-',
        room: row.roomId || '-', rack: row.rackId || '-',
        bags: row.packets, weightMt: parseFloat(row.weightQtl || 0) * 0.1,
        ageDays: age_days, status: row.status || 'Good'
      };
    })
  };
}

module.exports = { fetchColdStorages, registerNewColdStorage, fetchStorageSummary };
