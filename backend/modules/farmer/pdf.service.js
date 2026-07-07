const { buildStatementPdf } = require('./pdf/pdfStatement');
const { buildReceiptPdf } = require('./pdf/pdfReceipt');

module.exports = {
  buildStatementPdf,
  buildReceiptPdf
};
