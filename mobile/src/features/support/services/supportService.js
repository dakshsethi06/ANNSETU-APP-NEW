import { BACKEND_URL } from '../../../core/network/config';

/**
 * Sends support ticket submission to backend API
 */
export async function createSupportTicket({ name, phone, category, subject, description, role, attachments }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/support/ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, phone, category, subject, description, role, attachments }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || 'Failed to submit support ticket.');
    }
    return data; // returns { success: true, ticketId: 123456, ... }
  } catch (err) {
    if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
      throw new Error('Could not connect to support server. Please check your network connection.');
    }
    throw err;
  }
}

/**
 * Fetches previous tickets for the logged in phone number
 */
export async function fetchSupportTickets(phone) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/support/tickets?phone=${encodeURIComponent(phone)}`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch tickets');
    }
    return data.tickets;
  } catch (err) {
    if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
      throw new Error('Could not connect to support server.');
    }
    throw err;
  }
}

/**
 * Fetches conversations/replies for a specific ticket
 */
export async function fetchTicketConversations(ticketId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/support/tickets/${ticketId}/conversations`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch conversations');
    }
    return data.conversations;
  } catch (err) {
    if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
      throw new Error('Could not connect to support server.');
    }
    throw err;
  }
}


