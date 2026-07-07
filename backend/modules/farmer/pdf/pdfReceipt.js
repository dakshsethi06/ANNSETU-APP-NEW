const PDFDocument = require('pdfkit');
const { drawHeaderBand, drawFooter, getDetailedTransactionInfo } = require('./pdfHelpers');
const { drawTable } = require('./pdfTable');

function buildReceiptPdf(res, data) {
  const { farmer, coldStorage, entry, ledger, fromDateStr, toDateStr, currentDateStr } = data;
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 60, left: 50, right: 50 }, bufferPages: true });
  doc.pipe(res);

  const primaryColor = '#1E5C2E';
  const textColor = '#3F3F46';
  const lightGray = '#F4F4F5';
  const borderGreen = '#EAD9B0';

  drawHeaderBand(doc, 'Transaction Receipt', primaryColor);
  doc.moveDown(4.5);

  const currentY = doc.y;
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('FARMER DETAILS', 50, currentY);
  doc.strokeColor(primaryColor).lineWidth(1).moveTo(50, currentY + 14).lineTo(250, currentY + 14).stroke();
  doc.fillColor(textColor).font('Helvetica').fontSize(9.5);
  doc.text(`Name: ${farmer.name || 'N/A'}`, 50, currentY + 22);
  doc.text(`Mobile: ${farmer.phone || 'N/A'}`, 50, currentY + 36);
  doc.text(`Farmer ID: ${farmer.id || 'N/A'}`, 50, currentY + 50);

  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('COLD STORAGE DETAILS', 300, currentY);
  doc.strokeColor(primaryColor).lineWidth(1).moveTo(300, currentY + 14).lineTo(545, currentY + 14).stroke();
  doc.fillColor(textColor).font('Helvetica').fontSize(9.5);
  doc.text(`Name: ${coldStorage.name || 'N/A'}`, 300, currentY + 22);
  doc.text(`Mobile: ${coldStorage.phone || 'N/A'}`, 300, currentY + 36);
  const addressText = `Address: ${coldStorage.address || 'N/A'}`;
  doc.text(addressText, 300, currentY + 50, { width: 245 });

  const addressHeight = doc.heightOfString(addressText, { width: 245 });
  const detailsBottom = Math.max(currentY + 64, currentY + 50 + addressHeight);

  const info = getDetailedTransactionInfo(entry, farmer, coldStorage);
  const voucherY = detailsBottom + 15;
  doc.rect(50, voucherY, 495, 195).fill(lightGray).strokeColor(borderGreen).lineWidth(1.5).stroke();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('TRANSACTION VOUCHER DETAILS', 65, voucherY + 12);
  doc.strokeColor('#E4E4E7').lineWidth(1).moveTo(65, voucherY + 27).lineTo(530, voucherY + 27).stroke();

  const labelsLeft = [
    { text: 'TRANSACTION STATUS:', y: 36, value: info.status.toUpperCase(), color: ['Success', 'APPROVED', 'PAID'].includes(info.status) ? '#16A34A' : '#B45309', bold: true },
    { text: 'AMOUNT:', y: 62, value: `Rs. ${info.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, bold: true },
    { text: 'TRANSACTION TYPE:', y: 88, value: info.type.toUpperCase(), color: info.type === 'Debit' ? '#DC2626' : '#16A34A', bold: true },
    { text: 'DATE & TIME:', y: 114, value: info.dateTime },
    { text: 'UTR / REFERENCE:', y: 140, value: info.utr || 'N/A', wrapWidth: 120 },
    { text: 'FROM ACCOUNT:', y: 166, value: info.fromAccount || 'N/A' }
  ];
  labelsLeft.forEach(l => {
    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text(l.text, 65, voucherY + l.y);
    doc.fillColor(l.color || textColor).font(l.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).text(l.value, 165, voucherY + l.y, l.wrapWidth ? { width: l.wrapWidth } : undefined);
  });

  const labelsRight = [
    { text: 'TO BENEFICIARY:', y: 36, value: info.toAccount || 'N/A', wrapWidth: 140 },
    { text: 'PAYMENT MODE:', y: 88, value: info.paymentMode || 'N/A' },
    { text: 'REMARKS:', y: 114, value: info.remarks || 'N/A', wrapWidth: 140 },
    { text: 'BANK NAME:', y: 140, value: info.bankName || 'N/A' },
    { text: 'TRANSACTION ID:', y: 166, value: info.transactionId || 'N/A', wrapWidth: 140 }
  ];
  labelsRight.forEach(r => {
    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text(r.text, 295, voucherY + r.y);
    doc.fillColor(textColor).font('Helvetica').fontSize(8.5).text(r.value, 395, voucherY + r.y, r.wrapWidth ? { width: r.wrapWidth } : undefined);
  });

  doc.x = 50;
  doc.y = voucherY + 210;
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text(`STATEMENT TIMELINE (${fromDateStr} to ${toDateStr})`);
  doc.moveDown(0.3);

  const txHeaders = ['Date', 'Description', 'Reference/Order ID', 'Debit (Rs.)', 'Credit (Rs.)', 'Running Bal (Rs.)'];
  const txColWidths = [65, 140, 100, 60, 60, 70];
  const txAlignments = ['left', 'left', 'left', 'right', 'right', 'right'];
  const txRows = ledger.map(item => {
    const isItemDebit = item.amount < 0;
    return [
      new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      item.title || '',
      item.id || 'N/A',
      isItemDebit ? Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-',
      !isItemDebit ? Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-',
      item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })
    ];
  });

  drawTable(doc, 50, doc.y, txHeaders, txRows, txColWidths, txAlignments, primaryColor, textColor, lightGray);
  drawFooter(doc, 'This is a system-generated receipt and does not require a signature.');
  doc.end();
}

module.exports = { buildReceiptPdf };
