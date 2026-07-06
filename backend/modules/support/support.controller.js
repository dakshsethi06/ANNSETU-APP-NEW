const supportService = require('./support.service');

async function createSupportTicket(req, res) {
  try {
    const { name, phone, email, category, subject, description, role, attachments } = req.body;

    // Simple request validations
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

    const result = await supportService.createTicket({
      name: name ? name.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      email: email ? email.trim() : undefined,
      category,
      subject: subject.trim(),
      description: description.trim(),
      role,
      attachments
    });

    return res.status(200).json({
      success: true,
      ticketId: result.ticketId,
      message: result.message,
      source: result.source
    });
  } catch (error) {
    console.error('[Support Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred while logging support ticket.'
    });
  }
}

async function getTickets(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.'
      });
    }

    const tickets = await supportService.listTickets(phone);
    return res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('[Support Controller getTickets Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching support tickets.'
    });
  }
}

async function getConversations(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required.'
      });
    }

    const conversations = await supportService.getTicketConversations(id);
    return res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('[Support Controller getConversations Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching ticket conversations.'
    });
  }
}

module.exports = { createSupportTicket, getTickets, getConversations };
