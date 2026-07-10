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
    if (isNaN(d.getTime())) return dateStr;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    if (isToday) {
      return lang === 'en' ? `Today, ${timeStr}` : `आज, ${timeStr}`;
    }
    if (isYesterday) {
      return lang === 'en' ? `Yesterday, ${timeStr}` : `कल, ${timeStr}`;
    }

    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsHi = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
    const monthName = lang === 'en' ? monthsEn[d.getMonth()] : monthsHi[d.getMonth()];
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();

    const datePart = `${day} ${monthName} ${year}`;
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
    if (!isNaN(date.getTime())) {
      const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthsHi = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
      const monthName = state.lang === 'en' ? monthsEn[date.getMonth()] : monthsHi[date.getMonth()];
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      formattedTime = `${day} ${monthName} ${year}, ${hours}:${minutes} ${ampm}`;
    } else {
      formattedTime = item.date;
    }
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

export const formatDate = (dateStr, lang = 'en') => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsHi = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
    const monthName = lang === 'en' ? monthsEn[d.getMonth()] : monthsHi[d.getMonth()];
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day} ${monthName} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

