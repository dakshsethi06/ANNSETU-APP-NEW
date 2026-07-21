/**
 * Dispatch request validation middleware.
 * Fails fast on missing required fields before the controller is invoked.
 */

function validateCreateDispatch(req, res, next) {
  const { farmerId, coldStorageId, commodity, bags } = req.body;
  if (!farmerId || !coldStorageId || !commodity || !bags) {
    return res.status(400).json({
      success: false,
      error: 'farmerId, coldStorageId, commodity, and bags are required.'
    });
  }
  next();
}

function validateApproveDispatch(req, res, next) {
  const { mpin } = req.body;
  if (!mpin) {
    return res.status(400).json({
      success: false,
      error: 'MPIN is required for dispatch authorization.'
    });
  }
  next();
}

function validateGetDispatches(req, res, next) {
  const { farmerId, coldStorageId } = req.query;
  if (!farmerId && !coldStorageId) {
    return res.status(400).json({
      success: false,
      error: 'Either farmerId or coldStorageId is required.'
    });
  }
  next();
}

module.exports = {
  validateCreateDispatch,
  validateApproveDispatch,
  validateGetDispatches
};
