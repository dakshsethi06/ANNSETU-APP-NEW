const {
  createTicketLive,
  createTicketMock,
  listTicketsLive,
  listTicketsMock,
  getTicketConversationsLive,
  getTicketConversationsMock
} = require('./support.handlers');

// Helper to determine if Freshdesk live mode should be used
function isFreshdeskLive() {
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  return !!(domain && apiKey && apiKey !== 'YOUR_FRESHDESK_API_KEY' && !apiKey.startsWith('your_'));
}

/**
 * Creates a support ticket in Freshdesk (Live) or falls back to SMTP + log storage (Mock).
 */
async function createTicket(data) {
  if (isFreshdeskLive()) {
    return createTicketLive(data);
  }
  return createTicketMock(data);
}

/**
 * Lists tickets matching a given phone number by requester contact lookup or local cache filter.
 */
async function listTickets(phone) {
  if (isFreshdeskLive()) {
    return listTicketsLive(phone);
  }
  return listTicketsMock(phone);
}

/**
 * Gets replies/conversations for a specific ticket.
 */
async function getTicketConversations(ticketId) {
  if (isFreshdeskLive()) {
    return getTicketConversationsLive(ticketId);
  }
  return getTicketConversationsMock(ticketId);
}

module.exports = { createTicket, listTickets, getTicketConversations };
