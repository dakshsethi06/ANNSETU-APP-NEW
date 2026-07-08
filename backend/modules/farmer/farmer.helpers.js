const pdfService = require('./pdf.service');

/**
 * Generate CSV statement content for a farmer.
 */
function buildCsvStatement(farmer, ledger) {
  let csv = `Annsetu Farmer Account Statement\n`;
  csv += `Farmer Name,${farmer.name}\n`;
  csv += `Phone,${farmer.phone}\n`;
  csv += `Opening Balance,₹${parseFloat(farmer.openingBalance || 0).toFixed(2)}\n\n`;
  csv += `Date,Description,Amount (₹),Balance (₹)\n`;

  const chronological = [...ledger].reverse();
  chronological.forEach(item => {
    const formattedDate = new Date(item.date).toLocaleDateString('en-IN');
    const amountStr = item.amount < 0
      ? `-${Math.abs(item.amount).toFixed(2)}`
      : `+${Math.abs(item.amount).toFixed(2)}`;
    csv += `"${formattedDate}","${item.title.replace(/"/g, '""')}",${amountStr},${item.balance.toFixed(2)}\n`;
  });

  return csv;
}

/**
 * Setup and trigger PDF statement build for a farmer.
 */
function buildPdfStatement(res, farmer, coldStorage, ledger, paymentsRes) {
  const coldStorageDetails = {
    name: coldStorage.displayName,
    address: coldStorage.address,
    phone: coldStorage.phone
  };

  const totalCharged = ledger.reduce((sum, item) => item.amount < 0 ? sum + Math.abs(item.amount) : sum, 0);
  const totalPaid = ledger.reduce((sum, item) => item.amount > 0 ? sum + item.amount : sum, 0);
  const pendingRent = parseFloat(farmer.pendingRent || 0);

  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let periodStr = '';
  if (ledger.length > 0) {
    const oldestDate = new Date(ledger[ledger.length - 1].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const newestDate = new Date(ledger[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    periodStr = `${oldestDate} - ${newestDate}`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Khata_Statement_${todayStr}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  pdfService.buildStatementPdf(res, {
    farmer,
    coldStorage: coldStorageDetails,
    ledger,
    payments: paymentsRes,
    summary: { totalCharged, totalPaid, netPayable: pendingRent },
    currentDateStr,
    periodStr
  });
}

module.exports = {
  buildCsvStatement,
  buildPdfStatement
};
