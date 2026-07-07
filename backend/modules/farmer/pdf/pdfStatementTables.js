const { drawTable } = require('./pdfTable');

function renderStatementBody(doc, ledger, summary, closingBalance, P, T, G) {
  doc.fillColor(P).font('Helvetica-Bold').fontSize(9).text('TRANSACTION HISTORY', 40);
  doc.strokeColor(P).lineWidth(0.5).moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke();
  doc.moveDown(0.4);

  const sorted = [...ledger].sort((a, b) => new Date(a.date) - new Date(b.date));

  const headers = [
    'Transaction\nDate', 'Value\nDate', 'Description / Narration',
    'Transaction ID /\nUTR', 'Payment\nMethod',
    'Debit (Rs.)', 'Credit (Rs.)', 'Running\nBal (Rs.)', 'Status'
  ];
  // Total = 535 (fits between 30 and 565)
  const widths  = [52, 52, 120, 80, 46, 48, 48, 50, 39];
  const aligns  = ['left','left','left','left','center','right','right','right','center'];

  const rows = sorted.length > 0 ? sorted.map(item => {
    const isDebit = item.amount < 0;
    const d = new Date(item.date).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });

    let method = '-';
    if (!isDebit) {
      const m = (item.paymentMode || '').toUpperCase();
      method = ['UPI','IMPS','NEFT','RTGS','CARD','WALLET','CASH'].includes(m) ? m : 'ONLINE';
    }

    let status = 'Success';
    if (item.status) {
      const s = item.status.toUpperCase();
      if (s === 'PENDING') status = 'Pending';
      else if (s === 'FAILED') status = 'Failed';
      else if (s === 'REVERSED') status = 'Reversed';
    }

    const fmtAmt = (v) => Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return [
      d, d,
      item.title || (isDebit ? 'Storage Billing Charge' : 'Payment Received'),
      item.reference || item.bankTransactionId || item.billNumber || item.id || 'N/A',
      method,
      isDebit ? fmtAmt(item.amount) : '-',
      !isDebit ? fmtAmt(item.amount) : '-',
      fmtAmt(item.balance),
      status
    ];
  }) : [
    ['-', '-', 'No transactions found', '-', '-', '-', '-', '-', '-']
  ];

  const endY = drawTable(doc, 30, doc.y, headers, rows, widths, aligns, P, T, G);
  drawClosingSummary(doc, endY, summary, closingBalance, sorted.length, P, T, G);
  drawPageFooters(doc);
  doc.end();
}

function drawClosingSummary(doc, startY, summary, closingBalance, txnCount, P, T, G) {
  let y = startY + 12;
  if (y + 40 > 745) { doc.addPage(); y = 50; }

  // 4-cell summary row matching the screenshot
  const cellW = 535 / 4;
  doc.rect(30, y, 535, 35).fill(G);
  doc.strokeColor(P).lineWidth(1).rect(30, y, 535, 35).stroke();

  const items = [
    { label: 'TOTAL AMOUNT\nCREDITED', value: fmtRs(summary.totalPaid || 0), color: '#16A34A' },
    { label: 'TOTAL AMOUNT\nDEBITED', value: fmtRs(summary.totalCharged || 0), color: '#EF4444' },
    { label: 'TOTAL\nTRANSACTIONS', value: txnCount.toString(), color: T },
    { label: 'CLOSING\nBALANCE', value: fmtRs(closingBalance), color: P }
  ];

  items.forEach((item, idx) => {
    const x = 30 + idx * cellW;
    if (idx > 0) doc.strokeColor('#D4D4D8').lineWidth(0.5).moveTo(x, y + 3).lineTo(x, y + 32).stroke();
    doc.fillColor(T).font('Helvetica-Bold').fontSize(6).text(item.label, x + 5, y + 4, { width: cellW - 10, align: 'center' });
    doc.fillColor(item.color).font('Helvetica-Bold').fontSize(8).text(item.value, x + 5, y + 22, { width: cellW - 10, align: 'center' });
  });
}

function drawPageFooters(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.strokeColor('#D4D4D8').lineWidth(0.5).moveTo(30, 782).lineTo(565, 782).stroke();
    doc.fillColor('#71717A').font('Helvetica').fontSize(6.5);
    doc.text('This is a system-generated statement and does not require a signature.', 30, 786, { width: 350 });
    doc.text('Generated dynamically from AnnSetu securely.', 30, 795, { width: 350 });
    doc.text(`Page ${i + 1} of ${range.count}`, 420, 786, { align: 'right', width: 145 });
  }
}

function fmtRs(val) {
  return 'Rs. ' + Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

module.exports = { renderStatementBody };
