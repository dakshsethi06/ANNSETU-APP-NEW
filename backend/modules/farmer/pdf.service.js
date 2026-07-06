const PDFDocument = require('pdfkit');

function buildStatementPdf(res, data) {
  const { farmer, coldStorage, ledger, payments, summary, currentDateStr, periodStr } = data;

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    bufferPages: true // Allows adding page numbers at the end
  });

  // Pipe the doc to response
  doc.pipe(res);

  // Set colors
  const primaryColor = '#1E5C2E'; // Dark green
  const textColor = '#3F3F46'; // Slate gray
  const lightGray = '#F4F4F5';
  const borderGreen = '#EAD9B0';

  // --- 1. HEADER BAND ---
  doc.rect(0, 0, 595.28, 90).fill(primaryColor);

  // Logo Drawing: Embedding the actual AnnSetu logo image from assets
  const path = require('path');
  const fs = require('fs');
  const logoPath = path.join(__dirname, '..', '..', '..', 'mobile', 'assets', 'ann_setu_logo.png');

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 25, { width: 40 });
  } else {
    // Fallback if logo is missing
    doc.circle(50, 45, 20).fill('#FFFFFF');
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(14).text('AS', 40, 39, { width: 20, align: 'center' });
  }

  // Branding Title
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('AnnSetu', 85, 33);
  doc.font('Helvetica').fontSize(10).text('Connecting Farmers & Cold Storages', 85, 55);

  // Title/Date on Right (removing "Khata Statement" title)
  doc.fillColor('#FFFFFF').font('Helvetica').fontSize(9.5).text(`Generated: ${currentDateStr}`, 350, 40, { align: 'right', width: 195 });

  doc.moveDown(4.5);

  // --- 2. DOUBLE-COLUMN FARMER & COLD STORAGE DETAILS ---
  const currentY = doc.y;
  
  // Left Column - Farmer Details
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('FARMER DETAILS', 50, currentY);
  doc.strokeColor(primaryColor).lineWidth(1).moveTo(50, currentY + 14).lineTo(250, currentY + 14).stroke();
  
  doc.fillColor(textColor).font('Helvetica').fontSize(9.5);
  doc.text(`Name: ${farmer.name || 'N/A'}`, 50, currentY + 22);
  doc.text(`Mobile: ${farmer.phone || 'N/A'}`, 50, currentY + 36);
  doc.text(`Farmer ID: ${farmer.id || 'N/A'}`, 50, currentY + 50);

  // Right Column - Cold Storage Details
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('COLD STORAGE DETAILS', 300, currentY);
  doc.strokeColor(primaryColor).lineWidth(1).moveTo(300, currentY + 14).lineTo(545, currentY + 14).stroke();
  
  doc.fillColor(textColor).font('Helvetica').fontSize(9.5);
  doc.text(`Name: ${coldStorage.name || 'N/A'}`, 300, currentY + 22);
  doc.text(`Mobile: ${coldStorage.phone || 'N/A'}`, 300, currentY + 36);
  
  const addressText = `Address: ${coldStorage.address || 'N/A'}`;
  doc.text(addressText, 300, currentY + 50, { width: 245 });

  // Calculate height of details dynamically to avoid overlap
  const addressHeight = doc.heightOfString(addressText, { width: 245 });
  const rightColumnBottom = currentY + 50 + addressHeight;
  const leftColumnBottom = currentY + 64;
  const detailsBottom = Math.max(leftColumnBottom, rightColumnBottom);

  // Period label
  doc.y = detailsBottom + 12;
  if (periodStr) {
    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9.5).text(`Statement Period: `, 50, doc.y, { continued: true });
    doc.font('Helvetica').text(periodStr);
    doc.moveDown(0.5);
  } else {
    doc.moveDown(1);
  }

  // --- 3. ACCOUNT SUMMARY CARD ---
  const summaryY = doc.y;
  doc.rect(50, summaryY, 495, 55).fill(lightGray).strokeColor(borderGreen).lineWidth(1).stroke();
  
  // Total Storage Charges
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9).text('TOTAL CHARGES', 65, summaryY + 12, { width: 110, align: 'center' });
  doc.fillColor('#DC2626').font('Helvetica-Bold').fontSize(12).text(`Rs. ${summary.totalCharged.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 65, summaryY + 28, { width: 110, align: 'center' });

  // Total Payments Made
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9).text('TOTAL PAID', 190, summaryY + 12, { width: 110, align: 'center' });
  doc.fillColor('#16A34A').font('Helvetica-Bold').fontSize(12).text(`Rs. ${summary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, summaryY + 28, { width: 110, align: 'center' });

  // Net Dues (Pending Amount)
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9).text('PENDING AMOUNT', 315, summaryY + 12, { width: 110, align: 'center' });
  const dues = summary.totalCharged - summary.totalPaid;
  doc.fillColor(dues > 0 ? '#B45309' : '#16A34A').font('Helvetica-Bold').fontSize(12).text(`Rs. ${(dues > 0 ? dues : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 315, summaryY + 28, { width: 110, align: 'center' });

  // Net Payable (Outstanding Rent)
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9).text('NET PAYABLE', 440, summaryY + 12, { width: 90, align: 'center' });
  doc.fillColor('#EF4444').font('Helvetica-Bold').fontSize(12).text(`Rs. ${summary.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, summaryY + 28, { width: 90, align: 'center' });

  doc.x = 50;
  doc.y = summaryY + 70;

  // --- 4. TRANSACTION HISTORY TABLE ---
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('TRANSACTION HISTORY');
  doc.moveDown(0.3);

  const txHeaders = ['Date', 'Description', 'Reference/Order ID', 'Debit (Rs.)', 'Credit (Rs.)', 'Running Bal (Rs.)'];
  const txColWidths = [65, 140, 100, 60, 60, 70];
  const txAlignments = ['left', 'left', 'left', 'right', 'right', 'right'];

  const txRows = ledger.map(item => {
    const isDebit = item.amount < 0;
    const dateFormatted = new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return [
      dateFormatted,
      item.title || '',
      item.id || 'N/A',
      isDebit ? Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-',
      !isDebit ? Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-',
      item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })
    ];
  });

  let nextY = drawTable(doc, 50, doc.y, txHeaders, txRows, txColWidths, txAlignments, primaryColor, textColor, lightGray);

  doc.y = nextY + 15;

  // --- 5. PAYMENT HISTORY TABLE ---
  // If we are near the bottom, add a new page
  if (doc.y > 650) {
    doc.addPage();
  }

  doc.x = 50;
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('PAYMENT RECORDS');
  doc.moveDown(0.3);

  const pmHeaders = ['Payment Date', 'Payment Method', 'Transaction/UTR ID', 'Status', 'Amount'];
  const pmColWidths = [100, 100, 130, 85, 80];
  const pmAlignments = ['left', 'left', 'left', 'center', 'right'];

  const pmRows = payments.map(item => {
    const dateFormatted = new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return [
      dateFormatted,
      (item.paymentMode || 'online').toUpperCase(),
      item.reference || item.id || 'N/A',
      item.status || 'PENDING',
      parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    ];
  });

  drawTable(doc, 50, doc.y, pmHeaders, pmRows, pmColWidths, pmAlignments, primaryColor, textColor, lightGray);

  // --- 6. PAGE NUMBERS AND FOOTER ---
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Temporarily set bottom margin to 0 to prevent footer text from triggering auto page breaks
    doc.page.margins.bottom = 0;

    // Draw Footer Divider line
    doc.strokeColor('#E4E4E7').lineWidth(1).moveTo(50, 785).lineTo(545, 785).stroke();

    // Footer texts
    doc.fillColor('#71717A').font('Helvetica').fontSize(7.5);
    doc.text('This is a system-generated statement and does not require a signature.', 50, 792, { width: 350 });
    doc.text('Generated by AnnSetu', 50, 802, { width: 350 });

    // Page Number
    doc.text(`Page ${i + 1} of ${range.count}`, 400, 792, { align: 'right', width: 145 });
  }

  // Finalize PDF
  doc.end();
}

function drawTable(doc, startX, startY, headers, rows, columnWidths, alignments, primaryColor, textColor, lightGray) {
  let currentY = startY;
  const tableWidth = columnWidths.reduce((a, b) => a + b, 0);

  // Helper to draw the header row
  const drawHeader = (y) => {
    // 1. Calculate header row height
    let maxHeaderHeight = 12;
    headers.forEach((header, index) => {
      const width = columnWidths[index];
      const headerHeight = doc.heightOfString(header, { width: width - 8 });
      if (headerHeight > maxHeaderHeight) {
        maxHeaderHeight = headerHeight;
      }
    });
    const headerRowHeight = maxHeaderHeight + 6;

    // 2. Draw background
    doc.rect(startX, y, tableWidth, headerRowHeight).fill(primaryColor);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);

    // 3. Render header text
    let tempX = startX;
    headers.forEach((header, index) => {
      const width = columnWidths[index];
      const align = alignments[index] || 'left';
      doc.text(header, tempX + 4, y + 4, { width: width - 8, align: align });
      tempX += width;
    });

    return headerRowHeight;
  };

  // Draw initial header
  const initialHeaderHeight = drawHeader(currentY);
  currentY += initialHeaderHeight;

  // Table Rows
  rows.forEach((row, rowIndex) => {
    // 1. Calculate row height based on tallest cell
    let maxCellHeight = 14;
    row.forEach((cell, cellIndex) => {
      const width = columnWidths[cellIndex];
      const cellHeight = doc.heightOfString(cell.toString(), { width: width - 8 });
      if (cellHeight > maxCellHeight) {
        maxCellHeight = cellHeight;
      }
    });
    const rowHeight = maxCellHeight + 6;

    // 2. Page breaking check
    if (currentY + rowHeight > 745) {
      doc.addPage();
      currentY = 50; // top margin of new page
      const newHeaderHeight = drawHeader(currentY);
      currentY += newHeaderHeight;
    }

    // 3. Draw alternate row background color
    const isEven = rowIndex % 2 === 0;
    doc.rect(startX, currentY, tableWidth, rowHeight)
       .fill(isEven ? lightGray : '#FFFFFF');

    // 4. Draw row text
    doc.fillColor(textColor).font('Helvetica').fontSize(8);
    let tempX = startX;
    row.forEach((cell, cellIndex) => {
      const width = columnWidths[cellIndex];
      const align = alignments[cellIndex] || 'left';
      doc.text(cell.toString(), tempX + 4, currentY + 4, { width: width - 8, align: align });
      tempX += width;
    });

    currentY += rowHeight;
  });

  return currentY;
}

module.exports = {
  buildStatementPdf
};
