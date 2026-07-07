const PDFDocument = require('pdfkit');
const { drawHeaderBand } = require('./pdfHelpers');
const { renderStatementBody } = require('./pdfStatementTables');

function buildStatementPdf(res, data) {
  const { farmer, ledger, summary, currentDateStr, periodStr, openingBalance, closingBalance } = data;
  const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 60, left: 40, right: 40 }, bufferPages: true });
  doc.pipe(res);

  const P = '#1E5C2E', T = '#3F3F46', G = '#F4F4F5';

  // ─── 1. HEADER BAND ───
  drawHeaderBand(doc, 'ACCOUNT STATEMENT', P);
  doc.y = 100;

  // ─── 2. TWO-COLUMN INFO SECTION ───
  const infoY = doc.y;
  // Left: Farmer Information
  doc.fillColor(P).font('Helvetica-Bold').fontSize(9).text('FARMER INFORMATION', 40, infoY);
  doc.strokeColor(P).lineWidth(0.5).moveTo(40, infoY + 12).lineTo(280, infoY + 12).stroke();
  const leftLabels = [
    ['Farmer Name:', farmer.name || 'N/A'],
    ['Farmer ID:', farmer.id || 'N/A'],
    ['Mobile Number:', farmer.phone ? `+91 ${farmer.phone}` : 'N/A'],
    ['Email ID:', farmer.email || 'N/A']
  ];
  let ly = infoY + 18;
  leftLabels.forEach(([label, val]) => {
    doc.fillColor(T).font('Helvetica-Bold').fontSize(8).text(label, 40, ly);
    doc.font('Helvetica').text(val, 135, ly);
    ly += 13;
  });

  // Right: Account Summary (no bank details)
  doc.fillColor(P).font('Helvetica-Bold').fontSize(9).text('ACCOUNT SUMMARY', 310, infoY);
  doc.strokeColor(P).lineWidth(0.5).moveTo(310, infoY + 12).lineTo(555, infoY + 12).stroke();
  doc.fillColor(T).font('Helvetica-Bold').fontSize(8).text('Statement Period:', 310, infoY + 18);
  doc.font('Helvetica').text(periodStr || 'All Transactions', 400, infoY + 18, { width: 155 });
  doc.font('Helvetica-Bold').text('Generated:', 310, infoY + 31);
  doc.font('Helvetica').text(currentDateStr, 400, infoY + 31, { width: 155 });

  // ─── 3. OPENING BALANCE BAR ───
  const obY = ly + 8;
  doc.rect(40, obY, 515, 20).fill(G);
  doc.strokeColor('#D4D4D8').lineWidth(0.5).rect(40, obY, 515, 20).stroke();
  doc.fillColor(T).font('Helvetica-Bold').fontSize(8.5).text('Opening Balance:', 50, obY + 5);
  const obStr = formatRs(openingBalance);
  doc.fillColor(P).font('Helvetica-Bold').fontSize(8.5).text(obStr, 400, obY + 5, { align: 'right', width: 145 });

  // ─── 4. HAND OFF TO TABLE ───
  doc.x = 40;
  doc.y = obY + 30;
  renderStatementBody(doc, ledger, summary, closingBalance, P, T, G);
}

function formatRs(val) {
  return 'Rs. ' + Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

module.exports = { buildStatementPdf, formatRs };
