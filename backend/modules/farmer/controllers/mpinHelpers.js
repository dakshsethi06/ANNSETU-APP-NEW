const crypto = require('crypto');

function hashMpin(mpin) {
  if (!mpin) return '';
  return crypto.createHash('sha256').update(mpin.toString()).digest('hex');
}

function verifyMpin(mpin, storedHash) {
  if (!storedHash) return false;
  if (!mpin) return false;
  if (storedHash.length !== 64) {
    return storedHash.toString() === mpin.toString();
  }
  return hashMpin(mpin) === storedHash;
}

module.exports = { hashMpin, verifyMpin };
