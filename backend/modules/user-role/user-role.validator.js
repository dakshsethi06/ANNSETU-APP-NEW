function validateUserRole(req, res, next) {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone parameter required' });
  }
  next();
}

module.exports = { validateUserRole };
