const farmerRepository = require('../farmer.repository');
const db = require('../../../config/database');

async function downloadStatement(req, res) {
  try {
    const { id } = req.params;
    const { fromDate, toDate } = req.query;
    
    const farmerRes = await db.query('SELECT name, phone, "openingBalance" FROM "Farmer" WHERE id = $1', [id]);
    if (farmerRes.rows.length === 0) {
      return res.status(404).send('Farmer profile not found.');
    }
    const farmer = farmerRes.rows[0];

    const ledger = await farmerRepository.getFarmerLedger(id);

    const parseToISODate = (str) => {
      if (!str || str === 'undefined' || str === 'null') return null;
      str = str.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const parts = str.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
      return null;
    };

    const normalizedFrom = parseToISODate(fromDate);
    const normalizedTo = parseToISODate(toDate);

    const toISTDateStr = (d) => {
      if (!d) return '';
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    };

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
    csv += `Opening Balance,₹${parseFloat(farmer.openingBalance || 0).toFixed(2)}\n\n`;
    
    csv += `Date,Description,Amount (₹),Balance (₹)\n`;
    
    const chronological = [...filteredLedger].reverse();
    
    chronological.forEach(item => {
      const formattedDate = new Date(item.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      const amountStr = item.amount < 0 
        ? `-${Math.abs(item.amount).toFixed(2)}` 
        : `+${Math.abs(item.amount).toFixed(2)}`;
      csv += `"${formattedDate}","${item.title.replace(/"/g, '""')}",${amountStr},${item.balance.toFixed(2)}\n`;
    });

    const filename = normalizedFrom && normalizedTo 
      ? `statement_${farmer.name.replace(/\s+/g, '_')}_${normalizedFrom}_to_${normalizedTo}.csv`
      : `statement_${farmer.name.replace(/\s+/g, '_')}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(csv);
  } catch (error) {
    console.error('Download statement error:', error.message);
    return res.status(500).send('Failed to generate statement file.');
  }
}

module.exports = { downloadStatement };
