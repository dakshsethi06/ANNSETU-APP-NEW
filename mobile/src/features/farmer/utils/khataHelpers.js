import { Platform } from 'react-native';

export const getFormattedReceiptUrl = (note, BACKEND_URL) => {
  if (!note) return null;
  const index = note.indexOf('/uploads/');
  if (index !== -1) {
    const relativePath = note.substring(index);
    return `${BACKEND_URL}${relativePath}`;
  }
  if (note.startsWith('http')) {
    return note;
  }
  return `${BACKEND_URL}/uploads/${note}`;
};

export const formatLedgerDateTime = (dateStr, lang) => {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (isToday) {
      return lang === 'en' ? `Today, ${timeStr}` : `आज, ${timeStr}`;
    }
    if (isYesterday) {
      return lang === 'en' ? `Yesterday, ${timeStr}` : `कल, ${timeStr}`;
    }

    const datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${datePart}, ${timeStr}`;
  } catch (e) {
    return dateStr;
  }
};

export function getDetailedTransactionInfo(item, farmer, state) {
  const isDebit = item.amount < 0;
  const absAmount = Math.abs(item.amount);
  
  let hash = 0;
  for (let i = 0; i < item.id.length; i++) {
    hash = item.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  const status = isDebit ? 'Success' : (item.status || 'Success');
  const fromAccount = isDebit ? 'N/A' : (farmer?.name || 'Farmer');
  
  const banks = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Punjab National Bank'];
  const bankName = isDebit ? 'N/A' : (item.bankName || banks[seed % banks.length]);
  
  const paymentMode = isDebit ? 'N/A' : (item.paymentMode || 'UPI');
  const toAccount = isDebit ? 'AnnSetu Billing Account' : 'SN Sharma Cold Storage (annsetu@upi)';
  
  let formattedTime = '';
  try {
    const date = new Date(item.date);
    const datePart = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    formattedTime = `${datePart}, ${timePart}`;
  } catch (e) {
    formattedTime = item.date;
  }

  return {
    status: status.toUpperCase(),
    amount: `₹${absAmount.toLocaleString('en-IN')}`,
    type: isDebit ? (state.lang === 'en' ? 'Debit' : 'डेबिट') : (state.lang === 'en' ? 'Credit' : 'क्रेडिट'),
    dateTime: formattedTime,
    utr: item.reference || item.id,
    fromAccount,
    toAccount,
    paymentMode,
    remarks: item.title || (isDebit ? 'Storage Billing Charge' : 'Rent Payment'),
    bankName,
    transactionId: isDebit ? (item.billNumber || item.id) : (item.bankTransactionId || item.id)
  };
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

