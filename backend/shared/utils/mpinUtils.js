const crypto = require('crypto');

/**
 * Hashes an MPIN string using SHA-256.
 * @param {string|number} mpin - The plain text MPIN.
 * @returns {string} The hashed MPIN or empty string.
 */
function hashMpin(mpin) {
  if (!mpin) return '';
  return crypto.createHash('sha256').update(mpin.toString()).digest('hex');
}

/**
 * Verifies an MPIN against a stored hash or plain-text legacy MPIN.
 * @param {string|number} mpin - The plain text MPIN to verify.
 * @param {string} storedHash - The stored hash or plain text legacy value.
 * @returns {boolean} True if matched, false otherwise.
 */
function verifyMpin(mpin, storedHash) {
  if (!storedHash) return false;
  if (!mpin) return false;
  // Legacy plain-text MPINs (non-64-char hashes)
  if (storedHash.length !== 64) {
    return storedHash.toString() === mpin.toString();
  }
  return hashMpin(mpin) === storedHash;
}

module.exports = {
  hashMpin,
  verifyMpin
};
