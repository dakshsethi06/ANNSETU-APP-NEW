const fs = require('fs');
const path = require('path');

function drawHeaderBand(doc, title, primaryColor) {
  doc.rect(0, 0, 595.28, 90).fill(primaryColor);

  const logoPath = path.join(__dirname, '..', '..', '..', '..', 'mobile', 'assets', 'ann_setu_logo.png');
  const fallbackLogoPath = path.join(__dirname, '..', '..', '..', '..', 'ann_setu_logo.png');
  
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 22, { width: 45 });
  } else if (fs.existsSync(fallbackLogoPath)) {
    doc.image(fallbackLogoPath, 30, 22, { width: 45 });
  } else {
    doc.circle(52, 45, 22).fill('#FFFFFF');
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(15).text('AS', 42, 38, { width: 20, align: 'center' });
  }

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('AnnSetu', 90, 26);
  doc.font('Helvetica').fontSize(10).text('Connecting Farmers & Cold Storages', 90, 50);

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text(title, 320, 36, { align: 'right', width: 245 });
}

function drawFooter(doc, noteText) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;

    doc.strokeColor('#E4E4E7').lineWidth(1).moveTo(40, 785).lineTo(555, 785).stroke();

    doc.fillColor('#71717A').font('Helvetica').fontSize(7.5);
    doc.text(noteText, 40, 792, { width: 350 });
    doc.text('Generated dynamically from AnnSetu securely.', 40, 802, { width: 350 });

    doc.text(`Page ${i + 1} of ${range.count}`, 410, 792, { align: 'right', width: 145 });
  }
}

function getDetailedTransactionInfo(item, farmer, coldStorage) {
  const isDebit = item.amount < 0;
  const absAmount = Math.abs(item.amount);
  
  let hash = 0;
  for (let i = 0; i < item.id.length; i++) {
    hash = item.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  const status = isDebit ? 'Success' : (item.status || 'Success');
  const fromAccount = isDebit ? 'N/A' : (farmer.name || 'Farmer');
  
  const banks = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Punjab National Bank'];
  const bankName = isDebit ? 'N/A' : (item.bankName || banks[seed % banks.length]);
  
  const paymentMode = isDebit ? 'N/A' : (item.paymentMode || 'UPI');
  const toAccount = isDebit ? 'AnnSetu Billing Account' : `${coldStorage.name || 'Cold Storage'} (annsetu@upi)`;
  
  return {
    status,
    amount: absAmount,
    type: isDebit ? 'Debit' : 'Credit',
    dateTime: new Date(item.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
    utr: item.reference || item.id,
    fromAccount,
    toAccount,
    paymentMode,
    remarks: item.title || (isDebit ? 'Storage Billing Charge' : 'Rent Payment'),
    bankName,
    transactionId: isDebit ? (item.billNumber || item.id) : (item.bankTransactionId || item.id)
  };
}

module.exports = { drawHeaderBand, drawFooter, getDetailedTransactionInfo };
