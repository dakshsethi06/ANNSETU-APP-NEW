/**
 * Constants and Enums for the Farmer Module
 */

module.exports = {
  DEFAULT_MPIN: '1234',
  DEFAULT_STATE: 'Uttar Pradesh',
  DEFAULT_COMMODITY: 'Potato',
  
  ERROR_MESSAGES: {
    COLD_STORAGE_REQUIRED: 'coldStorageId is required for registering a new farmer.',
    FARMER_NOT_FOUND: 'Farmer profile not found.',
    INVALID_MPIN_CS: 'Invalid MPIN for Cold Storage. Please try again.',
    INVALID_MPIN_FARMER: 'Invalid MPIN. Please try again.',
    INVALID_OTP: 'Invalid verification OTP.',
    MPIN_LENGTH: 'New MPIN must be at least 4 digits.',
  },

  ROLES: {
    COLD_STORAGE_FACILITY: 'ColdStorageFacility',
    FARMER: 'Farmer'
  }
};
