const farmerRepository = require('../farmer.repository');

async function getLedger(req, res) {
  try {
    const { id } = req.params;
    const ledger = await farmerRepository.getFarmerLedger(id);
    return res.json({ success: true, ledger });
  } catch (error) {
    console.error('PostgreSQL ledger GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ledger from database' });
  }
}

module.exports = { getLedger };
