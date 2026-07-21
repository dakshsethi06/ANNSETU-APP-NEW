/**
 * Amad request validation middleware.
 */

function validateCreateAmad(req, res, next) {
  const { farmerId, commodity, packets, weightQtl } = req.body;
  if (!farmerId || !commodity || !packets || !weightQtl) {
    return res.status(400).json({
      success: false,
      error: 'farmerId, commodity, packets, and weightQtl are required fields.'
    });
  }
  next();
}

module.exports = { validateCreateAmad };
