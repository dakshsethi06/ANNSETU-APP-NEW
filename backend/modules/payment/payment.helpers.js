/**
 * Helper utilities for Payment Module
 */

function extractBankNameAndTransactionId(payDetails) {
  let bankName = 'UPI Provider';
  let bankTransactionId = payDetails.id;

  if (payDetails.acquirer_data) {
    bankTransactionId = payDetails.acquirer_data.bank_transaction_id || payDetails.acquirer_data.rrn || payDetails.id;
  }

  const method = (payDetails.method || 'upi').toLowerCase();

  if (method === 'netbanking' && payDetails.bank) {
    const bankCode = payDetails.bank.toUpperCase();
    const bankMap = {
      'HDFC': 'HDFC Bank',
      'ICIC': 'ICICI Bank',
      'SBIN': 'State Bank of India',
      'UTIB': 'Axis Bank',
      'PUNB': 'Punjab National Bank',
      'BARB': 'Bank of Baroda',
      'CNRB': 'Canara Bank',
      'IBKL': 'IDBI Bank',
      'YESB': 'Yes Bank',
      'KKBK': 'Kotak Mahindra Bank'
    };
    bankName = bankMap[bankCode] || `${bankCode} Netbanking`;
  } else if (method === 'card' && payDetails.card) {
    bankName = payDetails.card.issuer || 'Card Issuer Bank';
  } else if (method === 'upi' && payDetails.vpa) {
    const vpa = payDetails.vpa.toLowerCase();
    if (vpa.includes('okaxis') || vpa.includes('axis')) bankName = 'Axis Bank';
    else if (vpa.includes('okhdfc') || vpa.includes('hdfc')) bankName = 'HDFC Bank';
    else if (vpa.includes('okicici') || vpa.includes('icici')) bankName = 'ICICI Bank';
    else if (vpa.includes('oksbi') || vpa.includes('sbi')) bankName = 'State Bank of India';
    else if (vpa.includes('okpostbaroda') || vpa.includes('baroda')) bankName = 'Bank of Baroda';
    else if (vpa.includes('paytm')) bankName = 'Paytm Payments Bank';
    else if (vpa.includes('ybl') || vpa.includes('ibl')) bankName = 'Yes Bank';
  }

  return { bankName, bankTransactionId };
}

module.exports = {
  extractBankNameAndTransactionId
};
