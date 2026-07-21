const storageService = require('./storage.service');

async function getColdStorages(req, res) {
  try {
    const coldStorages = await storageService.fetchColdStorages();
    return res.json({ success: true, coldStorages });
  } catch (error) {
    console.error('PostgreSQL cold-storages GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch cold storages from database' });
  }
}

async function registerColdStorage(req, res) {
  try {
    const coldStorage = await storageService.registerNewColdStorage(req.body);
    return res.status(201).json({ success: true, coldStorage });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: `Cold Storage with ID ${req.body.id} already exists` });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to register cold storage in database' });
  }
}

async function getSummary(req, res) {
  try {
    if (!req.query.coldStorageId) {
      return res.status(400).json({ success: false, error: 'coldStorageId query parameter is required.' });
    }
    const summary = await storageService.fetchStorageSummary(req.query.coldStorageId);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Cold storage not found.' });
    }
    return res.json({ success: true, summary });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch cold storage summary' });
  }
}

module.exports = { getColdStorages, registerColdStorage, getSummary };
