/**
 * Payment request validation middleware.
 * Validates request parameters and body structure before hitting controllers.
 */

function validateCreateOrder(req, res, next) {
  const { farmerId } = req.body;
  if (!farmerId) {
    return res.status(400).json({
      success: false,
      error: 'farmerId is required.'
    });
  }
  next();
}

function validateInitiatePayment(req, res, next) {
  const { farmerId, amount } = req.body;
  if (!farmerId || !amount) {
    return res.status(400).json({
      success: false,
      error: 'farmerId and amount are required'
    });
  }
  next();
}

function validateGetPaymentDetails(req, res, next) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Payment ID is required.'
    });
  }
  next();
}

module.exports = {
  validateCreateOrder,
  validateInitiatePayment,
  validateGetPaymentDetails
};
