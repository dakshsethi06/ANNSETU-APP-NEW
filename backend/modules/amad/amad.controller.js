const amadService = require('./amad.service');

async function createAmad(req, res) {
  try {
    const lot = await amadService.createNewAmadLot(req.body);
    return res.status(201).json({ success: true, lot });
  } catch (error) {
    console.error('PostgreSQL Amad POST error:', error.message);
    const status = error.statusCode || 400;
    return res.status(status).json({ success: false, error: error.message || 'Failed to register Amad lot in database' });
  }
}

async function getHoldings(req, res) {
  try {
    const holdings = await amadService.fetchHoldings();
    return res.json({ success: true, holdings });
  } catch (error) {
    console.error('PostgreSQL holdings GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch holdings from database' });
  }
}

module.exports = { createAmad, getHoldings };
