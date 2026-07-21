const pdfService = require('../pdf.service');
const { buildStatementPdf } = require('../pdf/pdfStatement');
const { buildReceiptPdf } = require('../pdf/pdfReceipt');

jest.mock('../pdf/pdfStatement', () => ({
  buildStatementPdf: jest.fn()
}));
jest.mock('../pdf/pdfReceipt', () => ({
  buildReceiptPdf: jest.fn()
}));

describe('pdf.service', () => {
  it('should export buildStatementPdf and buildReceiptPdf functions', () => {
    expect(pdfService.buildStatementPdf).toBe(buildStatementPdf);
    expect(pdfService.buildReceiptPdf).toBe(buildReceiptPdf);
  });
});
