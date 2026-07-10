const farmerRepository = require('../farmer.repository');
const db = require('../../../config/database');
const pdfService = require('../pdf.service');
const { parseToISODate, toISTDateStr, parseAndFormat } = require('./dateHelpers');

async function downloadStatementPdf(req, res) {
  try {
    const { id } = req.params;
    const { fromDate, toDate } = req.query;


    const farmer = await farmerRepository.getFarmerBasicDetails(id);
    if (!farmer) return res.status(404).send('Farmer profile not found.');


    const coldStorage = await farmerRepository.getColdStorageDetailsForFarmer(farmer.coldStorageId) || { displayName: 'Annsetu Cold Storage', address: 'Tundla', phone: '9999999999' };
    const coldStorageDetails = { name: coldStorage.displayName, address: coldStorage.address, phone: coldStorage.phone };

    const ledger = await farmerRepository.getFarmerLedger(id);
    const payments = await farmerRepository.getPaymentsForFarmer(id);

    const normalizedFrom = parseToISODate(fromDate);
    const normalizedTo = parseToISODate(toDate);
    const fullChronological = [...ledger].reverse();

    let filteredChronological = fullChronological;
    if (normalizedFrom && normalizedTo) {
      filteredChronological = fullChronological.filter(item => {
        const itemDateStr = toISTDateStr(item.date);
        return itemDateStr >= normalizedFrom && itemDateStr <= normalizedTo;
      });
    }

    let periodOpeningBalance = Number.parseFloat(farmer.openingBalance || 0);
    if (normalizedFrom) {
      const beforeEntries = fullChronological.filter(item => toISTDateStr(item.date) < normalizedFrom);
      if (beforeEntries.length > 0) periodOpeningBalance = beforeEntries[beforeEntries.length - 1].balance;
    }

    let periodClosingBalance = periodOpeningBalance;
    if (filteredChronological.length > 0) periodClosingBalance = filteredChronological[filteredChronological.length - 1].balance;

    let totalCredited = 0, totalDebited = 0;
    filteredChronological.forEach(item => {
      if (item.amount > 0) totalCredited += item.amount;
      else totalDebited += Math.abs(item.amount);
    });

    const summary = {
      totalCharged: totalDebited,
      totalPaid: totalCredited,
      netPayable: periodClosingBalance
    };

    const currentDateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });

    let periodStr = '';
    if (normalizedFrom && normalizedTo) {
      periodStr = `${parseAndFormat(normalizedFrom)} - ${parseAndFormat(normalizedTo)}`;
    } else if (ledger.length > 0) {
      const oldestDate = new Date(ledger[ledger.length - 1].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
      const newestDate = new Date(ledger[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
      periodStr = `${oldestDate} - ${newestDate}`;
    }

    const filename = normalizedFrom && normalizedTo
      ? `Khata_Statement_${normalizedFrom}_to_${normalizedTo}.pdf`
      : `Khata_Statement_${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    pdfService.buildStatementPdf(res, {
      farmer, coldStorage: coldStorageDetails, ledger: filteredChronological.reverse(), payments, summary,
      currentDateStr, periodStr,
      openingBalance: periodOpeningBalance, closingBalance: periodClosingBalance
    });
  } catch (error) {
    console.error('Download statement PDF error:', error.message);
    return res.status(500).send('Failed to generate PDF statement.');
  }
}

module.exports = { downloadStatementPdf };
