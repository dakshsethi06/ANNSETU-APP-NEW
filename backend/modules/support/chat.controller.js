const supportService = require('./support.service');
const { createAppNotification } = require('../../shared/notifications/notifications');
const fs = require('fs');
const path = require('path');

// Track tickets that have already triggered a closure notification to prevent duplicates
const notifiedClosedTickets = new Set();

async function verifyTicketOwnership(req, res, ticketId) {
  if (!req.user || !req.user.phone) return true; // Skip if no user phone
  try {
    const result = await supportService.getChatMessages(ticketId);
    if (result.contactPhone) {
      const cleanTicketPhone = result.contactPhone.replace(/[^0-9]/g, '');
      const cleanUserPhone = req.user.phone.replace(/[^0-9]/g, '');
      if (cleanTicketPhone && !cleanTicketPhone.includes(cleanUserPhone) && !cleanUserPhone.includes(cleanTicketPhone)) {
        res.status(403).json({ success: false, message: 'Forbidden: Ticket belongs to another user.' });
        return false;
      }
    }
  } catch (error) {
    // Ignore errors for ownership check, let the main controller handle missing tickets
  }
  return true;
}

/**
 * Start a new live chat session.
 * Creates a Zoho Desk ticket and returns the ticket ID.
 */
async function startChat(req, res) {
  try {
    let { name, phone, subject, description } = req.body;
    
    // Force phone to user's phone if authenticated
    if (req.user && req.user.phone) {
      phone = req.user.phone;
    }

    // Operational hours validation (9:00 AM to 10:00 PM IST, Monday - Friday)
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = istTime.getDay();
    const hour = istTime.getHours();
    
    if (day === 0 || day === 6 || hour < 9 || hour >= 22) {
      return res.status(400).json({
        success: false,
        message: 'Live support is currently offline. Our support team is available from 9:00 AM to 10:00 PM IST, Monday through Friday.',
      });
    }

    const result = await supportService.createTicket({
      name: name || 'App User',
      phone: phone || undefined,
      category: 'Live Chat',
      subject: subject || `Live Chat - ${name || 'App User'}`,
      description: description || `Live chat session started by ${name || 'App User'} (Phone: ${phone || 'N/A'})`,
      role: 'farmer',
      channel: 'Chat'
    });

    return res.status(200).json({
      success: true,
      ticketId: result.zohoId || result.ticketId,
      message: 'Chat session started.',
    });
  } catch (error) {
    console.error('[Chat Controller] startChat Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to start chat session.',
    });
  }
}

/**
 * Send a message in an active chat session directly as a Zoho comment.
 */
async function sendChatMessage(req, res) {
  try {
    const { ticketId } = req.params;
    const { message, senderName, attachment } = req.body;

    if (!(await verifyTicketOwnership(req, res, ticketId))) return;

    let finalMessage = message || '';

    // Handle inline file attachment uploads
    if (attachment && attachment.base64) {
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExt = attachment.name ? path.extname(attachment.name) : '.jpg';
      const fileName = `chat_${Date.now()}${fileExt}`;
      const filePath = path.join(uploadsDir, fileName);

      const base64Data = attachment.base64.includes(';base64,')
        ? attachment.base64.split(';base64,')[1]
        : attachment.base64;

      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      const serverUrl = `http://${req.headers.host}`;
      const fileUrl = `${serverUrl}/uploads/${fileName}`;
      finalMessage = `${finalMessage ? finalMessage + ' ' : ''}[Attachment: ${fileUrl}] <br/><img src="${fileUrl}" style="max-width:300px; border-radius:8px; display:block; margin-top:8px;" />`;
    }

    if (!finalMessage || !finalMessage.trim()) {
      return res.status(400).json({ success: false, message: 'Message or attachment is required.' });
    }

    // Save as public comment in Zoho Desk
    await supportService.addChatMessage(ticketId, finalMessage, senderName || 'App User');

    return res.status(200).json({
      success: true,
      message: 'Message sent.',
    });
  } catch (error) {
    console.error('[Chat Controller] sendChatMessage Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message.',
    });
  }
}

/**
 * Get all messages in a chat session directly from Zoho comments and conversations.
 */
async function getChatMessages(req, res) {
  try {
    const { ticketId } = req.params;

    if (!(await verifyTicketOwnership(req, res, ticketId))) return;

    const result = await supportService.getChatMessages(ticketId);
    
    const messages = result.messages.map(zm => ({
      id: zm.id,
      text: zm.text,
      sender: zm.sender,
      agentName: zm.sender === 'agent' ? (zm.agentName || 'Support Agent') : undefined,
      time: zm.time
    }));

    // Send notification when ticket is closed by agent (only once per ticket)
    if (result.status && result.status.toLowerCase() === 'closed' && !notifiedClosedTickets.has(ticketId)) {
      notifiedClosedTickets.add(ticketId);
      const phone = result.contactPhone;
      if (phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const db = require('../../config/database');
        const farmerRes = await db.query('SELECT id FROM "Farmer" WHERE phone LIKE $1 LIMIT 1', [`%${cleanPhone.slice(-10)}`]);
        if (farmerRes.rows.length > 0) {
          const farmerId = farmerRes.rows[0].id;
          const ticketLabel = result.ticketNumber ? `#${result.ticketNumber}` : '';
          await createAppNotification({
            userId: farmerId,
            type: 'info',
            title: 'Support Ticket Resolved',
            message: `Your support ticket ${ticketLabel} has been resolved by our customer support team. If you need further help, feel free to reach out again!`,
            icon: 'check-circle',
          });
          console.log(`[Chat Controller] Sent closure notification to farmer ${farmerId} for ticket ${ticketLabel}`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      messages,
      status: result.status
    });
  } catch (error) {
    console.error('[Chat Controller] getChatMessages Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch messages.',
    });
  }
}

/**
 * End/Close active support chat session
 */
async function closeChatSession(req, res) {
  try {
    const { ticketId } = req.params;
    if (!(await verifyTicketOwnership(req, res, ticketId))) return;
    await supportService.closeTicket(ticketId);
    return res.status(200).json({
      success: true,
      message: 'Chat session ended.',
    });
  } catch (error) {
    console.error('[Chat Controller] closeChatSession Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to end chat session.',
    });
  }
}

/**
 * Check if the user has an active, open support chat session.
 */
async function getActiveChatSession(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    if (req.user && req.user.phone && req.user.phone !== phone) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot access chat sessions of another user.' });
    }

    const tickets = await supportService.listTickets(phone);
    const activeTicket = tickets.find(t => 
      t.category === 'Live Chat' && 
      t.status.toLowerCase() !== 'closed'
    );

    if (activeTicket) {
      return res.status(200).json({
        success: true,
        active: true,
        ticketId: activeTicket.id,
        subject: activeTicket.subject
      });
    }

    return res.status(200).json({
      success: true,
      active: false
    });
  } catch (error) {
    console.error('[Chat Controller] getActiveChatSession Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check active chat session.',
    });
  }
}

/**
 * Submit chat satisfaction rating to Zoho comments
 */
async function submitChatFeedback(req, res) {
  try {
    const { ticketId } = req.params;
    const { rating, senderName } = req.body;
    if (!(await verifyTicketOwnership(req, res, ticketId))) return;
    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required.' });
    }

    const commentText = `Submitted Feedback Rating: ${rating}`;
    await supportService.addChatMessage(ticketId, commentText, senderName || 'App User');

    return res.status(200).json({
      success: true,
      message: 'Feedback submitted.',
    });
  } catch (error) {
    console.error('[Chat Controller] submitChatFeedback Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit feedback.',
    });
  }
}

module.exports = { 
  startChat, 
  sendChatMessage, 
  getChatMessages,
  closeChatSession,
  getActiveChatSession,
  submitChatFeedback
};
