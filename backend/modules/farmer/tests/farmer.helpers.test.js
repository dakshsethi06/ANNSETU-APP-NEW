const { buildCsvStatement, buildPdfStatement } = require('../farmer.helpers');
const pdfService = require('../pdf.service');

jest.mock('../pdf.service', () => ({
  buildStatementPdf: jest.fn()
}));

describe('farmer.helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildCsvStatement', () => {
    it('should correctly format and return a CSV string', () => {
      const farmer = { name: 'Ram Singh', phone: '9876543210', openingBalance: 1500 };
      const ledger = [
        { date: '2026-07-03T10:00:00.000Z', amount: 800, title: 'Payment', balance: 1400 },
        { date: '2026-07-01T10:00:00.000Z', amount: -500, title: 'Rent "Bill"', balance: 2000 }
      ];

      const csv = buildCsvStatement(farmer, ledger);
      expect(csv).toContain('Annsetu Farmer Account Statement');
      expect(csv).toContain('Farmer Name,Ram Singh');
      expect(csv).toContain('Opening Balance,₹1500.00');
      expect(csv).toContain('+800.00,1400.00');
      expect(csv).toContain('-500.00,2000.00');
      expect(csv).toContain('Rent ""Bill""'); // quotes escaped
    });

    it('should use default openingBalance 0 if not provided', () => {
      const farmer = { name: 'Ram Singh', phone: '9876543210' };
      const ledger = [];
      const csv = buildCsvStatement(farmer, ledger);
      expect(csv).toContain('Opening Balance,₹0.00');
    });
  });

  describe('buildPdfStatement', () => {
    it('should construct variables and call buildStatementPdf', () => {
      const res = { setHeader: jest.fn() };
      const farmer = { name: 'Ram', pendingRent: 500 };
      const coldStorage = { displayName: 'CS', address: 'Add', phone: '123' };
      const ledger = [
        { date: '2026-07-03T10:00:00.000Z', amount: 800, balance: 1400 },
        { date: '2026-07-01T10:00:00.000Z', amount: -500, balance: 2000 }
      ];
      const paymentsRes = [];

      buildPdfStatement(res, farmer, coldStorage, ledger, paymentsRes);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename='));
      expect(pdfService.buildStatementPdf).toHaveBeenCalledWith(res, expect.objectContaining({
        farmer,
        coldStorage: { name: 'CS', address: 'Add', phone: '123' },
        ledger,
        payments: paymentsRes,
        summary: { totalCharged: 500, totalPaid: 800, netPayable: 500 }
      }));
    });

    it('should handle falsy pendingRent and empty ledger', () => {
      const res = { setHeader: jest.fn() };
      const farmer = { name: 'Ram' };
      const coldStorage = { displayName: 'CS', address: 'Add', phone: '123' };
      const ledger = [];
      const paymentsRes = [];

      buildPdfStatement(res, farmer, coldStorage, ledger, paymentsRes);

      expect(pdfService.buildStatementPdf).toHaveBeenCalledWith(res, expect.objectContaining({
        summary: { totalCharged: 0, totalPaid: 0, netPayable: 0 },
        periodStr: ''
      }));
    });
  });
});

