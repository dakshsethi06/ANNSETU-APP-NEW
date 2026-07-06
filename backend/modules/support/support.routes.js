const express = require('express');
const router = express.Router();
const supportController = require('./support.controller');

router.post('/support/ticket', supportController.createSupportTicket);
router.get('/support/tickets', supportController.getTickets);
router.get('/support/tickets/:id/conversations', supportController.getConversations);

module.exports = router;
