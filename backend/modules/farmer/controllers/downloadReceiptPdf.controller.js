const farmerRepository = require('../farmer.repository');
const db = require('../../../config/database');
const pdfService = require('../pdf.service');

async function downloadReceiptPdf(req, res) {
  try {
    const { id } = req.params;
    const { entryId, fromDate, toDate } = req.query;

    if (!entryId || !fromDate || !toDate) {
      return res.status(400).send('Required parameters entryId, fromDate, and toDate are missing.');
    }

    const farmerRes = await db.query('SELECT * FROM "Farmer" WHERE id = $1', [id]);
    if (farmerRes.rows.length === 0) return res.status(404).send('Farmer profile not found.');
    const farmer = farmerRes.rows[0];

    const csRes = await db.query('SELECT "displayName", address, phone FROM "ColdStorageOnboarding" WHERE id = $1', [farmer.coldStorageId]);
    const coldStorage = csRes.rows.length > 0 ? csRes.rows[0] : { displayName: 'Annsetu Cold Storage', address: 'Tundla', phone: '9999999999' };
    const coldStorageDetails = { name: coldStorage.displayName, address: coldStorage.address, phone: coldStorage.phone };

    const ledger = await farmerRepository.getFarmerLedger(id);
    const entry = ledger.find(item => item.id === entryId);
    if (!entry) return res.status(404).send(`Ledger entry with ID ${entryId} not found.`);

    const filteredLedger = ledger.filter(item => {
      const itemDate = new Date(item.date).toISOString().split('T')[0];
      return itemDate >= fromDate && itemDate <= toDate;
    });

    const currentDateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const fromDateStr = new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const toDateStr = new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt_${entryId}_${fromDate}_to_${toDate}.pdf`);

    pdfService.buildReceiptPdf(res, {
      farmer, coldStorage: coldStorageDetails, entry, ledger: filteredLedger, fromDateStr, toDateStr, currentDateStr
    });
  } catch (error) {
    console.error('Download receipt PDF error:', error.message);
    return res.status(500).send('Failed to generate PDF receipt.');
  }
}

module.exports = { downloadReceiptPdf };
