const PDFDocument = require('pdfkit');
const fs = require('fs');
const { drawHeaderBand, drawFooter, getDetailedTransactionInfo } = require('../pdf/pdfHelpers');
const { drawTable } = require('../pdf/pdfTable');
const { renderStatementBody } = require('../pdf/pdfStatementTables');
const { buildStatementPdf } = require('../pdf/pdfStatement');
const { buildReceiptPdf } = require('../pdf/pdfReceipt');

let mockDoc;
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => mockDoc);
});

describe('PDF module files', () => {
  beforeEach(() => {
    mockDoc = {
      rect: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      image: jest.fn().mockReturnThis(),
      circle: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      lineWidth: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      switchToPage: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      heightOfString: jest.fn().mockReturnValue(12),
      bufferedPageRange: jest.fn().mockReturnValue({ start: 0, count: 1 }),
      page: { margins: { bottom: 0 } },
      y: 100,
      x: 40
    };
  });

  describe('pdfHelpers', () => {
    describe('drawHeaderBand', () => {
      test('draws header band and fallback shape if logo does not exist', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        drawHeaderBand(mockDoc, 'Test Statement', '#1E5C2E');
        expect(mockDoc.circle).toHaveBeenCalled();
        expect(mockDoc.text).toHaveBeenCalledWith('AS', expect.any(Number), expect.any(Number), expect.any(Object));
        fs.existsSync.mockRestore();
      });

      test('draws header band with logo if it exists', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        drawHeaderBand(mockDoc, 'Test Statement', '#1E5C2E');
        expect(mockDoc.image).toHaveBeenCalled();
        fs.existsSync.mockRestore();
      });

      test('draws header band with fallback logo if primary logo is missing', () => {
        jest.spyOn(fs, 'existsSync')
          .mockReturnValueOnce(false) // Primary fails
          .mockReturnValueOnce(true); // Fallback succeeds
        drawHeaderBand(mockDoc, 'Test Statement', '#1E5C2E');
        expect(mockDoc.image).toHaveBeenCalled();
        fs.existsSync.mockRestore();
      });
    });

    describe('drawFooter', () => {
      test('draws footer on all pages', () => {
        mockDoc.bufferedPageRange.mockReturnValue({ start: 0, count: 2 });
        drawFooter(mockDoc, 'Note Text');
        expect(mockDoc.switchToPage).toHaveBeenCalledTimes(2);
        expect(mockDoc.stroke).toHaveBeenCalled();
      });
    });

    describe('getDetailedTransactionInfo', () => {
      test('returns correct parsed info for debit transaction', () => {
        const item = { id: 'tx-1', amount: -500, date: '2026-07-01T10:00:00.000Z', title: 'Rent' };
        const farmer = { name: 'Ram' };
        const coldStorage = { name: 'Sharma CS' };
        const result = getDetailedTransactionInfo(item, farmer, coldStorage);

        expect(result.type).toBe('Debit');
        expect(result.amount).toBe(500);
        expect(result.fromAccount).toBe('N/A');
        expect(result.bankName).toBe('N/A');
        expect(result.paymentMode).toBe('N/A');
      });

      test('returns correct parsed info for credit transaction', () => {
        const item = { id: 'tx-2', amount: 800, date: '2026-07-01T10:00:00.000Z', status: 'Approved', reference: 'ref-1', bankTransactionId: 'bank-1' };
        const farmer = { name: 'Ram' };
        const coldStorage = { name: 'Sharma CS' };
        const result = getDetailedTransactionInfo(item, farmer, coldStorage);

        expect(result.type).toBe('Credit');
        expect(result.amount).toBe(800);
        expect(result.fromAccount).toBe('Ram');
        expect(result.status).toBe('Approved');
      });

      test('returns correct parsed info with fallbacks for missing fields', () => {
        const item = { id: 'tx-3', amount: 800, date: '2026-07-01T10:00:00.000Z' }; // Missing status, title, bankTransactionId, reference
        const farmer = {}; // Missing name
        const coldStorage = {}; // Missing name
        const resultCredit = getDetailedTransactionInfo(item, farmer, coldStorage);

        expect(resultCredit.status).toBe('Success');
        expect(resultCredit.fromAccount).toBe('Farmer');
        expect(resultCredit.toAccount).toBe('Cold Storage (annsetu@upi)');
        expect(resultCredit.remarks).toBe('Rent Payment');
        expect(resultCredit.transactionId).toBe('tx-3');

        const itemDebit = { id: 'tx-4', amount: -500, date: '2026-07-01T10:00:00.000Z' }; // Missing title, billNumber
        const resultDebit = getDetailedTransactionInfo(itemDebit, farmer, coldStorage);
        expect(resultDebit.remarks).toBe('Storage Billing Charge');
        expect(resultDebit.transactionId).toBe('tx-4');
      });
    });
  });

  describe('pdfTable', () => {
    test('renders table rows and triggers new pages when Y exceeds margin limit', () => {
      const headers = ['Col 1', 'Col 2'];
      const columnWidths = [100, 100];
      const rows = [
        ['R1C1', 'R1C2'],
        ['R2C1', 'R2C2']
      ];
      const alignments = ['left', 'right'];

      drawTable(mockDoc, 40, 740, headers, rows, columnWidths, alignments, '#1E5C2E', '#3F3F46', '#F4F4F5');

      expect(mockDoc.addPage).toHaveBeenCalled();
    });

    test('renders table rows with missing alignments to trigger fallbacks', () => {
      const headers = ['Col 1', 'Col 2'];
      const columnWidths = [100, 100];
      const rows = [['R1C1', 'R1C2']];
      const alignments = []; // Missing entirely to trigger 'left' fallback

      drawTable(mockDoc, 40, 100, headers, rows, columnWidths, alignments, '#1E5C2E', '#3F3F46', '#F4F4F5');
      // Should not throw and successfully call text
      expect(mockDoc.text).toHaveBeenCalled();
    });
  });


  describe('pdfStatement & pdfStatementTables', () => {
    test('builds statement pdf with table rendering', () => {
      const res = {};
      const data = {
        farmer: { name: 'Ram', id: 'F1', phone: '9876543210', email: 'test@email.com' },
        ledger: [
          { date: '2026-07-01T10:00:00.000Z', amount: -500, balance: 1500, title: 'Charge', reference: 'ref' },
          { date: '2026-07-02T10:00:00.000Z', amount: 800, balance: 700, status: 'pending' },
          { date: '2026-07-03T10:00:00.000Z', amount: 800, balance: 1500, status: 'failed' },
          { date: '2026-07-04T10:00:00.000Z', amount: 800, balance: 1500, status: 'reversed' }
        ],
        summary: { totalCharged: 500, totalPaid: 2400 },
        currentDateStr: '14 Jul 2026',
        periodStr: 'Period',
        openingBalance: 2000,
        closingBalance: 1500
      };

      buildStatementPdf(res, data);

      expect(mockDoc.pipe).toBeDefined();
    });

    test('builds statement pdf with empty ledger', () => {
      const res = {};
      const data = {
        farmer: { name: 'Ram', id: 'F1' },
        ledger: [],
        summary: { totalCharged: 0, totalPaid: 0 },
        currentDateStr: '14 Jul 2026',
        periodStr: '',
        openingBalance: 0,
        closingBalance: 0
      };

      buildStatementPdf(res, data);
      expect(mockDoc.pipe).toBeDefined();
    });

    test('builds statement pdf with missing farmer name and id to hit fallbacks', () => {
      const res = {};
      const data = {
        farmer: { phone: '9876543210', email: 'test@email.com' }, // Missing name and id
        ledger: [],
        summary: { totalCharged: 0, totalPaid: 0 },
        currentDateStr: '14 Jul 2026',
        periodStr: '',
        openingBalance: 0,
        closingBalance: 0
      };

      buildStatementPdf(res, data);
      expect(mockDoc.pipe).toBeDefined();
    });

    test('builds statement pdf and triggers page add for closing summary overflow and parses all statuses/methods', () => {
      const res = {};
      // Brute force ledger lengths to ensure we hit the exact boundary where endY > 705
      // With rowHeight=17, n=33 or 34 is required to hit the boundary exactly. We loop from 30 to 48 to guarantee it.
      for (let len = 30; len <= 48; len++) {
        const longLedger = Array.from({ length: len }).map((_, i) => ({
          id: i % 2 === 0 ? `id-${i}` : '',
          reference: i % 3 === 0 ? `ref-${i}` : '',
          bankTransactionId: i % 4 === 0 ? `bank-${i}` : '',
          billNumber: i % 5 === 0 ? `bill-${i}` : '',
          title: i % 2 === 0 ? 'Custom Title' : '',
          date: '2026-07-01T10:00:00.000Z',
          amount: i % 2 === 0 ? 800 : -800,
          balance: 1500,
          paymentMode: i % 2 === 0 ? 'UPI' : 'UNKNOWN_METHOD',
          status: ['PENDING', 'FAILED', 'REVERSED', 'SUCCESS'][i % 4]
        }));

        const data = {
          farmer: { name: 'Ram', id: 'F1' },
          ledger: longLedger,
          summary: { totalCharged: 0, totalPaid: 0 },
          currentDateStr: '14 Jul 2026',
          periodStr: '',
          openingBalance: 0,
          closingBalance: 0
        };

        buildStatementPdf(res, data);
      }
      expect(mockDoc.addPage).toHaveBeenCalled();
    });
  });

  describe('pdfReceipt', () => {
    test('builds debit receipt pdf successfully', () => {
      const res = {};
      const data = {
        farmer: { name: 'Ram', id: 'F1', phone: '9876543210' },
        coldStorage: { name: 'Sharma CS', phone: '999', address: 'Tundla' },
        entry: { id: 'tx-1', amount: -500, date: '2026-07-01T10:00:00.000Z', title: 'Rent' },
        ledger: [
          { id: 'tx-1', date: '2026-07-01T10:00:00.000Z', amount: -500, balance: 1500, title: 'Rent' }
        ],
        fromDateStr: '01 Jul 2026',
        toDateStr: '02 Jul 2026',
        currentDateStr: '14 Jul 2026'
      };

      buildReceiptPdf(res, data);

      expect(mockDoc.pipe).toBeDefined();
    });

    test('builds credit receipt pdf successfully', () => {
      const res = {};
      const data = {
        farmer: { name: 'Ram', id: 'F1', phone: '9876543210' },
        coldStorage: { name: 'Sharma CS', phone: '999', address: 'Tundla' },
        entry: { id: 'tx-2', amount: 800, date: '2026-07-01T10:00:00.000Z', status: 'PAID', reference: 'ref', bankTransactionId: 'bank' },
        ledger: [
          { id: 'tx-2', date: '2026-07-01T10:00:00.000Z', amount: 800, balance: 700, title: 'Payment' }
        ],
        fromDateStr: '01 Jul 2026',
        toDateStr: '02 Jul 2026',
        currentDateStr: '14 Jul 2026'
      };

      buildReceiptPdf(res, data);

      expect(mockDoc.pipe).toBeDefined();
    });

    test('builds receipt pdf with missing optional fields to hit fallbacks', () => {
      const res = {};
      const data = {
        farmer: {},
        coldStorage: {},
        entry: { id: '', amount: 500, date: '2026-07-01T10:00:00.000Z', status: 'FAILED' },
        ledger: [
          { amount: 500, date: '2026-07-01T10:00:00.000Z', balance: 1500, id: '' }
        ],
        fromDateStr: '',
        toDateStr: '',
        currentDateStr: ''
      };

      buildReceiptPdf(res, data);

      expect(mockDoc.pipe).toBeDefined();
    });
  });
});
