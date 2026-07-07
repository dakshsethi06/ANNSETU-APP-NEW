const axios = require('axios');
const nodemailer = require('nodemailer');
const { buildTicketDescriptionHtml, getMockConversationReply } = require('./support.templates');

// In-memory array to store mock tickets in Demo Mode during server runtime
const mockTickets = [];

/**
 * Live Freshdesk creation handler.
 */
async function createTicketLive({ name, phone, email, category, subject, description, role, attachments }) {
  const { FRESHDESK_DOMAIN: domain, FRESHDESK_API_KEY: apiKey } = process.env;
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${cleanDomain}/api/v2/tickets`;
  const authHeader = Buffer.from(`${apiKey}:X`).toString('base64');
  
  const userEmail = email || `${phone ? phone.replace(/[^0-9]/g, '') : 'user'}@annsetu.mock`;
  const ticketSubject = `[${category || 'General'}] ${subject}`;
  const ticketDescription = buildTicketDescriptionHtml({ category, name, phone, role, description });

  const headers = { Authorization: `Basic ${authHeader}` };
  let data;

  if (attachments?.length) {
    data = new FormData();
    data.append('subject', ticketSubject);
    data.append('description', ticketDescription);
    data.append('name', name || 'App User');
    if (phone) data.append('phone', phone);
    data.append('email', userEmail);
    data.append('priority', '1');
    data.append('status', '2');

    attachments.forEach(file => {
      if (file.base64) {
        data.append('attachments[]', new Blob([Buffer.from(file.base64, 'base64')], { type: file.type }), file.name);
      }
    });
  } else {
    headers['Content-Type'] = 'application/json';
    data = {
      subject: ticketSubject,
      description: ticketDescription,
      name: name || 'App User',
      phone: phone || undefined,
      email: userEmail,
      priority: 1,
      status: 2,
    };
  }

  try {
    const response = await axios.post(url, data, { headers });
    return {
      success: true,
      ticketId: response.data.id,
      message: 'Ticket successfully created in Freshdesk',
      source: 'freshdesk'
    };
  } catch (error) {
    console.error('[Freshdesk Service] API connection error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.description || 'Failed to connect to Freshdesk. Please check backend config.');
  }
}

/**
 * Mock creation handler.
 */
async function createTicketMock({ name, phone, email, category, subject, description, role, attachments }) {
  const ticketSubject = `[${category || 'General'}] ${subject}`;
  const ticketDescription = buildTicketDescriptionHtml({ category, name, phone, role, description });

  console.log(`----------------------------------------------------
[SUPPORT PROXY] Freshdesk credentials not configured.
[SUPPORT PROXY] Requester Name: ${name}
[SUPPORT PROXY] Phone Number: ${phone}
[SUPPORT PROXY] Role: ${role}
[SUPPORT PROXY] Category: ${category}
[SUPPORT PROXY] Subject: ${subject}
[SUPPORT PROXY] Description: ${description}
[SUPPORT PROXY] Attachments Count: ${attachments ? attachments.length : 0}
----------------------------------------------------`);

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });

      const emailAttachments = (attachments || [])
        .filter(f => f.base64)
        .map(f => ({
          filename: f.name,
          content: Buffer.from(f.base64, 'base64'),
          contentType: f.type
        }));

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
    description,
    name: name || 'App User',
    phone,
    email,
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
  const headers = { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/json' };

  try {
    const contactsUrl = `https://${cleanDomain}/api/v2/contacts?phone=${encodeURIComponent(cleanPhone)}`;
    const contactsResponse = await axios.get(contactsUrl, { headers });
    const contacts = contactsResponse.data || [];
    if (contacts.length === 0) return [];

    const ticketsUrl = `https://${cleanDomain}/api/v2/tickets?requester_id=${contacts[0].id}&include=description`;
    const response = await axios.get(ticketsUrl, { headers });
    return response.data || [];
  } catch (error) {
    console.error('[Freshdesk Service] List tickets error:', error.response?.data || error.message);
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
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('[Freshdesk Service] Get conversations error:', error.response?.data || error.message);
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
