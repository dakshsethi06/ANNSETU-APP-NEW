/**
 * Support request validation middleware.
 * Ensures required fields are present before hitting controllers.
 */

function validateCreateSupportTicket(req, res, next) {
  const { subject, description } = req.body;

  if (!subject || !subject.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Subject is required.'
    });
  }

  if (!description || !description.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Description is required.'
    });
  }

  next();
}

function validateGetTickets(req, res, next) {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required.'
    });
  }

  next();
}

module.exports = {
  validateCreateSupportTicket,
  validateGetTickets
};
