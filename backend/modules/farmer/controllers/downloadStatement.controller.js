const farmerRepository = require('../farmer.repository');
const farmerConstants = require('../farmer.constants');
const { parseToISODate, toISTDateStr } = require('./dateHelpers');

async function downloadStatement(req, res) {
  try {
    const { id } = req.params;
    const { fromDate, toDate } = req.query;

    const farmer = await farmerRepository.getFarmerBasicDetails(id);
    if (!farmer) {
      return res.status(404).send(farmerConstants.ERROR_MESSAGES.FARMER_NOT_FOUND);
    }

    const ledger = await farmerRepository.getFarmerLedger(id);

    const normalizedFrom = parseToISODate(fromDate);
    const normalizedTo = parseToISODate(toDate);

    let filteredLedger = ledger;
    if (normalizedFrom && normalizedTo) {
      filteredLedger = ledger.filter(item => {
        const itemDateStr = toISTDateStr(item.date);
        return itemDateStr >= normalizedFrom && itemDateStr <= normalizedTo;
      });
    }

    let csv = `Annsetu Farmer Account Statement\n`;
    if (normalizedFrom && normalizedTo) {
      csv += `Statement Period,${normalizedFrom} to ${normalizedTo}\n`;
    }
    csv += `Farmer Name,${farmer.name}\n`;
    csv += `Phone,${farmer.phone}\n`;
    csv += `Opening Balance,₹${Number.parseFloat(farmer.openingBalance || 0).toFixed(2)}\n\n`;

    csv += `Date,Description,Amount (₹),Balance (₹)\n`;

    const chronological = [...filteredLedger].reverse();

    chronological.forEach(item => {
      const formattedDate = new Date(item.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      const amountStr = item.amount < 0
        ? `-${Math.abs(item.amount).toFixed(2)}`
        : `+${Math.abs(item.amount).toFixed(2)}`;
      csv += `"${formattedDate}","${item.title.replaceAll('"', '""')}",${amountStr},${item.balance.toFixed(2)}\n`;
    });

    const filename = normalizedFrom && normalizedTo
      ? `statement_${farmer.name.replaceAll(/\s+/g, '_')}_${normalizedFrom}_to_${normalizedTo}.csv`
      : `statement_${farmer.name.replaceAll(/\s+/g, '_')}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(csv);
  } catch (error) {
    console.error('Download statement error:', error.message);
    return res.status(500).send('Failed to generate statement file.');
  }
}

module.exports = { downloadStatement };
