// Simple in-memory storage for MPIN reset OTPs
// Maps cleanPhone -> { code, expiresAt }
const otpStore = new Map();

module.exports = otpStore;
