const axios = require('axios');
const nodemailer = require('nodemailer');
const { buildTicketDescriptionHtml, getMockConversationReply } = require('./support.templates');

// In-memory array to store mock tickets in Demo Mode during server runtime
const mockTickets = [];

/**
 * Live Freshdesk creation handler.
 */
async function createTicketLive({ name, phone, email, category, subject, description, role, attachments }) {
  const { FREESCOUT_URL: rawUrl, FREESCOUT_API_KEY: apiKey } = process.env;
  const cleanUrl = rawUrl ? rawUrl.replace(/\/$/, '') : '';
  const url = `${cleanUrl}/conversations`;

  const userEmail = email || `${phone ? phone.replace(/[^0-9]/g, '') : 'user'}@annsetu.mock`;
  const ticketSubject = `[${category || 'General'}] ${subject}`;
  const ticketDescription = buildTicketDescriptionHtml({ category, name, phone, role, description });
  const mailboxId = parseInt(process.env.FREESCOUT_MAILBOX_ID || '1', 10);

  const formattedAttachments = (attachments || [])
    .filter(file => file.base64)
    .map(file => {
      const base64Data = file.base64.includes(';base64,') 
        ? file.base64.split(';base64,')[1] 
        : file.base64;
      return {
        filename: file.name || 'attachment',
        data: base64Data
      };
    });

  const headers = {
    'X-FreeScout-API-Key': apiKey,
    'Content-Type': 'application/json'
  };

  const body = {
    type: 'email',
    mailboxId,
    subject: ticketSubject,
    customer: {
      email: userEmail,
      firstName: name || 'App User',
      phone: phone || undefined
    },
    threads: [
      {
        type: 'customer',
        text: ticketDescription,
        attachments: formattedAttachments.length ? formattedAttachments : undefined
      }
    ]
  };

  try {
    const response = await axios.post(url, body, { headers });
    return {
      success: true,
      ticketId: response.data.id,
      message: 'Ticket successfully created in FreeScout',
      source: 'freescout'
    };
  } catch (error) {
    console.error('[FreeScout Service] API connection error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to connect to FreeScout. Please check backend config.');
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
function mapFreescoutStatusToFreshdesk(status) {
  switch (status) {
    case 'active': return 2;
    case 'pending': return 3;
    case 'closed': return 5;
    default: return 2;
  }
}

async function listTicketsLive(phone) {
  const { FREESCOUT_URL: rawUrl, FREESCOUT_API_KEY: apiKey } = process.env;
  const cleanUrl = rawUrl ? rawUrl.replace(/\/$/, '') : '';
  const cleanPhone = phone ? phone.trim() : '';
  const headers = {
    'X-FreeScout-API-Key': apiKey,
    'Content-Type': 'application/json'
  };

  try {
    let url = `${cleanUrl}/conversations?customerPhone=${encodeURIComponent(cleanPhone)}&embed=threads`;
    let response = await axios.get(url, { headers });
    let conversations = response.data?._embedded?.conversations || response.data?.conversations || [];

    // Fallback search by mock email
    if (conversations.length === 0) {
      const mockEmail = `${phone ? phone.replace(/[^0-9]/g, '') : 'user'}@annsetu.mock`;
      url = `${cleanUrl}/conversations?customerEmail=${encodeURIComponent(mockEmail)}&embed=threads`;
      response = await axios.get(url, { headers });
      conversations = response.data?._embedded?.conversations || response.data?.conversations || [];
    }

    return conversations.map(c => {
      const firstThread = c.threads && c.threads.length > 0 ? c.threads[0].text : '';
      return {
        id: c.id,
        subject: c.subject,
        status: mapFreescoutStatusToFreshdesk(c.status),
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        description: c.preview || firstThread || '',
        category: 'Support'
      };
    });
  } catch (error) {
    console.error('[FreeScout Service] List tickets error:', error.response?.data || error.message);
    throw new Error('Failed to retrieve tickets from FreeScout.');
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
  const { FREESCOUT_URL: rawUrl, FREESCOUT_API_KEY: apiKey } = process.env;
  const cleanUrl = rawUrl ? rawUrl.replace(/\/$/, '') : '';
  const url = `${cleanUrl}/conversations/${ticketId}?embed=threads`;
  const headers = {
    'X-FreeScout-API-Key': apiKey,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get(url, { headers });
    const threads = response.data?.threads || [];

    return threads.map(t => {
      const isIncoming = t.type === 'customer' || (t.createdBy && t.createdBy.type === 'customer');
      return {
        id: t.id,
        body: t.text || '',
        body_text: t.text || '',
        created_at: t.createdAt,
        incoming: isIncoming
      };
    });
  } catch (error) {
    console.error('[FreeScout Service] Get conversations error:', error.response?.data || error.message);
    throw new Error('Failed to retrieve conversations from FreeScout.');
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
