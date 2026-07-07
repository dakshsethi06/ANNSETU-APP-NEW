<<<<<<< Updated upstream
const farmerService = require('./farmer.service');

async function getFarmers(req, res) {
  try {
    const { state, serial_number } = req.query;
    const farmers = await farmerService.fetchFarmers(state, serial_number);
    return res.json({ success: true, farmers });
  } catch (error) {
    console.error('PostgreSQL farmers GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch farmers from database' });
  }
}

async function registerFarmer(req, res) {
  try {
    const farmer = await farmerService.registerNewFarmer(req.body);
    return res.status(201).json({ success: true, farmer });
  } catch (error) {
    console.error('PostgreSQL farmers POST error:', error.message);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: `Farmer with serial number ${req.body.serial_number} already exists` });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to register farmer in database' });
  }
}

async function getLedger(req, res) {
  try {
    const ledger = await farmerService.fetchLedger(req.params.id);
    return res.json({ success: true, ledger });
  } catch (error) {
    console.error('PostgreSQL ledger GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ledger from database' });
  }
}

async function loginMpin(req, res) {
  try {
    const result = await farmerService.loginWithMpin(req.body.phone, req.body.mpin);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('PostgreSQL login-mpin error:', error.message);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to authenticate via MPIN.' });
  }
}

async function resetMpin(req, res) {
  try {
    await farmerService.resetUserMpin(req.body.phone, req.body.otp, req.body.newMpin);
    return res.json({ success: true, message: 'MPIN reset successfully.' });
  } catch (error) {
    console.error('PostgreSQL reset-mpin error:', error.message);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to reset MPIN.' });
  }
}

async function downloadStatement(req, res) {
  try {
    const { csv, farmerName } = await farmerService.generateStatement(req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=statement_${farmerName.replace(/\s+/g, '_')}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Download statement error:', error.message);
    const status = error.statusCode || 500;
    return res.status(status).send('Failed to generate statement file.');
  }
}

async function downloadStatementPdf(req, res) {
  try {
    await farmerService.generateStatementPdf(req.params.id, res);
  } catch (error) {
    console.error('Download statement PDF error:', error.message);
    const status = error.statusCode || 500;
    return res.status(status).send('Failed to generate PDF statement.');
  }
}

module.exports = { getFarmers, registerFarmer, getLedger, downloadStatement, downloadStatementPdf, loginMpin, resetMpin };
=======
const { getFarmers } = require('./controllers/getFarmers.controller');
const { registerFarmer } = require('./controllers/registerFarmer.controller');
const { getLedger } = require('./controllers/getLedger.controller');
const { loginMpin } = require('./controllers/loginMpin.controller');
const { resetMpin } = require('./controllers/resetMpin.controller');
const { downloadStatement } = require('./controllers/downloadStatement.controller');
const { downloadStatementPdf } = require('./controllers/downloadStatementPdf.controller');
const { downloadReceiptPdf } = require('./controllers/downloadReceiptPdf.controller');

module.exports = {
  getFarmers,
  registerFarmer,
  getLedger,
  loginMpin,
  resetMpin,
  downloadStatement,
  downloadStatementPdf,
  downloadReceiptPdf
};
>>>>>>> Stashed changes
