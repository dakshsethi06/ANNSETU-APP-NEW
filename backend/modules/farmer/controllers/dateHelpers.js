function parseToISODate(str) {
  if (!str || str === 'undefined' || str === 'null') return null;
  str = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  const d = new Date(str);
  return !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
}

function toISTDateStr(d) {
  if (!d) return '';
  const dateObj = new Date(d);
  return Number.isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function parseAndFormat(dStr) {
  const parts = dStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  }
  return dStr;
}

module.exports = { parseToISODate, toISTDateStr, parseAndFormat };
