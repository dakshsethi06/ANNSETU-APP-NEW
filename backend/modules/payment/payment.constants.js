/**
 * Constants and Enums for the Payment Module
 */

module.exports = {
  PAYMENT_STATUS: {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed'
  },
  
  ERROR_MESSAGES: {
    PAYMENT_NOT_FOUND: 'Payment record not found.',
    FARMER_NOT_FOUND: 'Farmer not found.',
    SIGNATURE_INVALID: 'Invalid Razorpay signature',
    ALREADY_PROCESSED: 'Payment already processed'
  }
};
