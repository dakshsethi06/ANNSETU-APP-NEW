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
