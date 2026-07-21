const { extractBankNameAndTransactionId } = require('../payment.helpers');

describe('payment.helpers', () => {
  describe('extractBankNameAndTransactionId', () => {
    test('extracts acquirer bank transaction ID if available', () => {
      const details = { id: 'p1', acquirer_data: { bank_transaction_id: 'acq1' } };
      const res = extractBankNameAndTransactionId(details);
      expect(res.bankTransactionId).toBe('acq1');
    });

    test('extracts acquirer rrn if bank_transaction_id is not available', () => {
      const details = { id: 'p1', acquirer_data: { rrn: 'rrn1' } };
      const res = extractBankNameAndTransactionId(details);
      expect(res.bankTransactionId).toBe('rrn1');
    });

    test('falls back to payment ID if acquirer data is empty or missing details', () => {
      const details1 = { id: 'p1', acquirer_data: {} };
      expect(extractBankNameAndTransactionId(details1).bankTransactionId).toBe('p1');

      const details2 = { id: 'p1' };
      expect(extractBankNameAndTransactionId(details2).bankTransactionId).toBe('p1');
    });

    test('maps recognized netbanking bank codes to display names', () => {
      const banks = [
        { code: 'HDFC', expected: 'HDFC Bank' },
        { code: 'ICIC', expected: 'ICICI Bank' },
        { code: 'SBIN', expected: 'State Bank of India' },
        { code: 'UTIB', expected: 'Axis Bank' },
        { code: 'PUNB', expected: 'Punjab National Bank' },
        { code: 'BARB', expected: 'Bank of Baroda' },
        { code: 'CNRB', expected: 'Canara Bank' },
        { code: 'IBKL', expected: 'IDBI Bank' },
        { code: 'YESB', expected: 'Yes Bank' },
        { code: 'KKBK', expected: 'Kotak Mahindra Bank' },
        { code: 'unknown', expected: 'UNKNOWN Netbanking' }
      ];

      for (const { code, expected } of banks) {
        const details = { id: 'p1', method: 'netbanking', bank: code };
        expect(extractBankNameAndTransactionId(details).bankName).toBe(expected);
      }
    });

    test('extracts card issuer bank name or default fallback', () => {
      const details1 = { id: 'p1', method: 'card', card: { issuer: 'ICICI Bank Card' } };
      expect(extractBankNameAndTransactionId(details1).bankName).toBe('ICICI Bank Card');

      const details2 = { id: 'p1', method: 'card', card: {} };
      expect(extractBankNameAndTransactionId(details2).bankName).toBe('Card Issuer Bank');
    });

    test('maps recognized UPI VPAs to display names', () => {
      const vpas = [
        { vpa: 'someone@okaxis', expected: 'Axis Bank' },
        { vpa: 'someone@axis', expected: 'Axis Bank' },
        { vpa: 'someone@okhdfc', expected: 'HDFC Bank' },
        { vpa: 'someone@hdfc', expected: 'HDFC Bank' },
        { vpa: 'someone@okicici', expected: 'ICICI Bank' },
        { vpa: 'someone@icici', expected: 'ICICI Bank' },
        { vpa: 'someone@oksbi', expected: 'State Bank of India' },
        { vpa: 'someone@sbi', expected: 'State Bank of India' },
        { vpa: 'someone@okpostbaroda', expected: 'Bank of Baroda' },
        { vpa: 'someone@baroda', expected: 'Bank of Baroda' },
        { vpa: 'someone@paytm', expected: 'Paytm Payments Bank' },
        { vpa: 'someone@ybl', expected: 'Yes Bank' },
        { vpa: 'someone@ibl', expected: 'Yes Bank' },
        { vpa: 'someone@unknown', expected: 'UPI Provider' }
      ];

      for (const { vpa, expected } of vpas) {
        const details = { id: 'p1', method: 'upi', vpa };
        expect(extractBankNameAndTransactionId(details).bankName).toBe(expected);
      }
    });

    test('falls back to default bank name for other payment methods', () => {
      const details = { id: 'p1', method: 'wallet' };
      expect(extractBankNameAndTransactionId(details).bankName).toBe('UPI Provider');
    });
  });
});
