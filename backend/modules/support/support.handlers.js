const axios = require('axios');
const nodemailer = require('nodemailer');
const { buildTicketDescriptionHtml, getMockConversationReply } = require('./support.templates');

// In-memory array to store mock tickets in Demo Mode during server runtime
const mockTickets = [];

/**
 * Live Freshdesk creation handler.
 */
async function createTicketLive({ name, phone, email, category, subject, description, role, attachments }) {
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${cleanDomain}/api/v2/tickets`;
  const authHeader = Buffer.from(`${apiKey}:X`).toString('base64');
  
  const cleanPhoneForEmail = phone ? phone.replace(/[^0-9]/g, '') : 'user';
  const userEmail = email || `${cleanPhoneForEmail}@annsetu.mock`;
  const ticketSubject = `[${category || 'General'}] ${subject}`;
  const ticketDescription = buildTicketDescriptionHtml({ category, name, phone, role, description });

  try {
    let response;
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      formData.append('subject', ticketSubject);
      formData.append('description', ticketDescription);
      formData.append('name', name || 'App User');
      if (phone) formData.append('phone', phone);
      formData.append('email', userEmail);
      formData.append('priority', '1');
      formData.append('status', '2');

      for (const file of attachments) {
        if (file.base64) {
          const buffer = Buffer.from(file.base64, 'base64');
          const blob = new Blob([buffer], { type: file.type });
          formData.append('attachments[]', blob, file.name);
        }
      }

      response = await axios.post(url, formData, {
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      });
    } else {
      const payload = {
        subject: ticketSubject,
        description: ticketDescription,
        name: name || 'App User',
        phone: phone || undefined,
        email: userEmail,
        priority: 1,
        status: 2,
      };

      response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      });
    }

    return {
      success: true,
      ticketId: response.data.id,
      message: 'Ticket successfully created in Freshdesk',
      source: 'freshdesk'
    };
  } catch (error) {
    console.error('[Freshdesk Service] API connection error:', error.response ? error.response.data : error.message);
    throw new Error(error.response?.data?.description || 'Failed to connect to Freshdesk. Please check backend config.');
  }
}

/**
 * Mock creation handler.
 */
async function createTicketMock({ name, phone, email, category, subject, description, role, attachments }) {
  const ticketSubject = `[${category || 'General'}] ${subject}`;
  const ticketDescription = buildTicketDescriptionHtml({ category, name, phone, role, description });

  console.log('----------------------------------------------------');
  console.log('[SUPPORT PROXY] Freshdesk credentials not configured.');
  console.log(`[SUPPORT PROXY] Requester Name: ${name}`);
  console.log(`[SUPPORT PROXY] Phone Number: ${phone}`);
  console.log(`[SUPPORT PROXY] Role: ${role}`);
  console.log(`[SUPPORT PROXY] Category: ${category}`);
  console.log(`[SUPPORT PROXY] Subject: ${subject}`);
  console.log(`[SUPPORT PROXY] Description: ${description}`);
  console.log(`[SUPPORT PROXY] Attachments Count: ${attachments ? attachments.length : 0}`);
  console.log('----------------------------------------------------');

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const emailAttachments = [];
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (file.base64) {
            emailAttachments.push({
              filename: file.name,
              content: Buffer.from(file.base64, 'base64'),
              contentType: file.type
            });
          }
        }
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.SMTP_FROM || process.env.SMTP_USER,
        subject: `[SUPPORT TICKET] ${ticketSubject}`,
        html: ticketDescription,
        attachments: emailAttachments
      });
      console.log('[SUPPORT PROXY] Email backup notification successfully dispatched.');
    } catch (smtpErr) {
      console.error('[SUPPORT PROXY] Fallback SMTP mailing error:', smtpErr.message);
    }
  }

  const mockTicketId = Math.floor(100000 + Math.random() * 900000);
  
  mockTickets.push({
    id: mockTicketId,
    subject: ticketSubject,
    description: description,
    name: name || 'App User',
    phone: phone,
    email: email,
    status: 2,
    category: category || 'General',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    attachments: attachments ? attachments.map(a => ({ name: a.name, type: a.type })) : []
  });

  return {
    success: true,
    ticketId: mockTicketId,
    message: 'Ticket registered successfully (Demo Mode)',
    source: 'mock'
  };
}

/**
 * Live listing handler.
 */
async function listTicketsLive(phone) {
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const cleanPhone = phone ? phone.trim() : '';
  const authHeader = Buffer.from(`${apiKey}:X`).toString('base64');

  try {
    const contactsUrl = `https://${cleanDomain}/api/v2/contacts?phone=${encodeURIComponent(cleanPhone)}`;
    console.log(`[Freshdesk Service] Finding contact from: ${contactsUrl}`);
    const contactsResponse = await axios.get(contactsUrl, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    const contacts = contactsResponse.data || [];
    if (contacts.length === 0) {
      console.log(`[Freshdesk Service] No contact found for phone ${cleanPhone}`);
      return [];
    }

    const contactId = contacts[0].id;
    const ticketsUrl = `https://${cleanDomain}/api/v2/tickets?requester_id=${contactId}`;
    console.log(`[Freshdesk Service] Listing tickets for requester ${contactId} from: ${ticketsUrl}`);
    const response = await axios.get(ticketsUrl, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data || [];
  } catch (error) {
    console.error('[Freshdesk Service] List tickets error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to retrieve tickets from Freshdesk.');
  }
}

/**
 * Mock listing handler.
 */
async function listTicketsMock(phone) {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  return mockTickets.filter(t => {
    const ticketPhone = t.phone ? t.phone.replace(/[^0-9]/g, '') : '';
    return ticketPhone === cleanPhone || ticketPhone.includes(cleanPhone) || cleanPhone.includes(ticketPhone);
  });
}

/**
 * Live conversations handler.
 */
async function getTicketConversationsLive(ticketId) {
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${cleanDomain}/api/v2/tickets/${ticketId}/conversations`;
  const authHeader = Buffer.from(`${apiKey}:X`).toString('base64');

  try {
    console.log(`[Freshdesk Service] Fetching conversations from: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('[Freshdesk Service] Get conversations error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to retrieve conversations for ticket.');
  }
}

/**
 * Mock conversations handler.
 */
async function getTicketConversationsMock() {
  return getMockConversationReply();
}

module.exports = {
  createTicketLive,
  createTicketMock,
  listTicketsLive,
  listTicketsMock,
  getTicketConversationsLive,
  getTicketConversationsMock
};
