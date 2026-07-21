function drawTable(doc, startX, startY, headers, rows, columnWidths, alignments, primaryColor, textColor, lightGray) {
  let currentY = startY;
  const tableWidth = columnWidths.reduce((a, b) => a + b, 0);

  // Helper to draw the header row
  const drawHeader = (y) => {
    // 1. Calculate header row height
    doc.font('Helvetica-Bold').fontSize(7);
    let maxHeaderHeight = 10;
    headers.forEach((header, index) => {
      const width = columnWidths[index];
      const headerHeight = doc.heightOfString(header, { width: width - 6 });
      if (headerHeight > maxHeaderHeight) maxHeaderHeight = headerHeight;
    });
    const headerRowHeight = maxHeaderHeight + 6;

    // 2. Draw background
    doc.rect(startX, y, tableWidth, headerRowHeight).fill(primaryColor);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7);

    // 3. Render header text
    let tempX = startX;
    headers.forEach((header, index) => {
      const width = columnWidths[index];
      const align = alignments[index] || 'left';
      doc.text(header, tempX + 3, y + 3, { width: width - 6, align: align });
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
    doc.font('Helvetica').fontSize(6.5);
    let maxCellHeight = 10;
    row.forEach((cell, cellIndex) => {
      const width = columnWidths[cellIndex];
      const cellHeight = doc.heightOfString(cell.toString(), { width: width - 6 });
      if (cellHeight > maxCellHeight) maxCellHeight = cellHeight;
    });
    const rowHeight = maxCellHeight + 5;

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
    doc.fillColor(textColor).font('Helvetica').fontSize(6.5);
    let tempX = startX;
    row.forEach((cell, cellIndex) => {
      const width = columnWidths[cellIndex];
      const align = alignments[cellIndex] || 'left';
      doc.text(cell.toString(), tempX + 3, currentY + 3, { width: width - 6, align: align });
      tempX += width;
    });

    currentY += rowHeight;
  });

  return currentY;
}

module.exports = { drawTable };
