/**
 * Storage request validation middleware.
 */

function validateRegisterColdStorage(req, res, next) {
  const { id, displayName } = req.body;
  if (!id || !displayName) {
    return res.status(400).json({
      success: false,
      error: 'id and displayName are required fields'
    });
  }
  next();
}

module.exports = { validateRegisterColdStorage };
