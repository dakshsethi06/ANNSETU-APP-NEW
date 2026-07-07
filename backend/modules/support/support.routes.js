const router = require('express').Router();
const { createSupportTicket, getTickets, getConversations } = require('./support.controller');
const { validateCreateSupportTicket, validateGetTickets } = require('./support.validator');

router.post('/support/ticket', validateCreateSupportTicket, createSupportTicket);
router.get('/support/tickets', validateGetTickets, getTickets);
router.get('/support/tickets/:id/conversations', getConversations);

module.exports = router;


