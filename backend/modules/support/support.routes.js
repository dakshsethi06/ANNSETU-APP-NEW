const router = require('express').Router();
const { createSupportTicket, getTickets, getConversations } = require('./support.controller');
const { validateCreateSupportTicket, validateGetTickets } = require('./support.validator');
const { 
  startChat, 
  sendChatMessage, 
  getChatMessages,
  closeChatSession,
  getActiveChatSession,
  submitChatFeedback
} = require('./chat.controller');

// Ticket routes
router.post('/support/ticket', validateCreateSupportTicket, createSupportTicket);
router.get('/support/tickets', validateGetTickets, getTickets);
router.get('/support/tickets/:id/conversations', getConversations);

// Live Chat routes
router.post('/support/chat/start', startChat);
router.get('/support/chat/active', getActiveChatSession);
router.post('/support/chat/:ticketId/message', sendChatMessage);
router.get('/support/chat/:ticketId/messages', getChatMessages);
router.post('/support/chat/:ticketId/close', closeChatSession);
router.post('/support/chat/:ticketId/feedback', submitChatFeedback);

module.exports = router;
