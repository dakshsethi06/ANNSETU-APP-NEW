// ─── Zoho Desk OAuth Token Management ────────────────────────────
let cachedAccessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 300000) {
    return cachedAccessToken;
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_DESK_CLIENT_ID,
    client_secret: process.env.ZOHO_DESK_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_DESK_REFRESH_TOKEN,
  });

  const res = await fetch('https://accounts.zoho.in/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await res.json();
  if (data.error) {
    console.error('[ZohoDesk] Token refresh error:', data);
    throw new Error(`Zoho token error: ${data.error}`);
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);
  console.log('[ZohoDesk] Access token refreshed successfully.');
  return cachedAccessToken;
}

function getHeaders() {
  return {
    'orgId': process.env.ZOHO_DESK_ORG_ID,
  };
}

// ─── Create Ticket ───────────────────────────────────────────────
async function createTicket(data) {
  const { name, phone, email, category, subject, description, role, channel } = data;

  const accessToken = await getAccessToken();
  const departmentId = process.env.ZOHO_DESK_DEPARTMENT_ID;

  const derivedEmail = email || (phone ? `${phone.replace(/[^0-9]/g, '')}@annsetu.com` : 'user@annsetu.com');

  const ticketData = {
    subject,
    description,
    departmentId,
    category: category || 'General',
    priority: 'Medium',
    channel: channel || 'Web',
    email: derivedEmail,
    phone: phone || undefined,
    contact: {
      lastName: name || 'App User',
      email: derivedEmail,
      phone: phone || undefined,
    },
    cf: {
      cf_role: role || 'farmer',
    },
  };

  const zohoRes = await fetch('https://desk.zoho.in/api/v1/tickets', {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
      ...getHeaders(),
    },
    body: JSON.stringify(ticketData),
  });

  const result = await zohoRes.json();

  if (!zohoRes.ok) {
    console.error('[ZohoDesk] Create ticket error:', result);
    throw new Error(result.message || 'Failed to create ticket on Zoho Desk.');
  }

  console.log('[ZohoDesk] Ticket created:', result.ticketNumber);
  return {
    ticketId: result.ticketNumber || result.id,
    zohoId: result.id,
    message: `Ticket #${result.ticketNumber} created successfully.`,
    source: 'zoho_desk',
  };
}

// ─── List Tickets ────────────────────────────────────────────────
async function listTickets(phone) {
  const accessToken = await getAccessToken();

  // Fetch all recent tickets with contact and assignee details included
  const ticketsRes = await fetch(
    `https://desk.zoho.in/api/v1/tickets?limit=100&sortBy=-createdTime&include=contacts,assignee`,
    {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        ...getHeaders(),
      },
    }
  );

  if (ticketsRes.status === 204 || ticketsRes.status === 404) {
    return [];
  }

  const ticketsData = await ticketsRes.json();
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';

  const mappedTickets = (ticketsData.data || []).map(t => {
    const tContact = t.contact || {};
    const tPhone = tContact.phone || '';
    const tEmail = tContact.email || '';
    const tName = tContact.lastName || tContact.firstName || 'App User';
    const tAssignee = t.assignee || {};
    const tAssigneeName = tAssignee.name || tAssignee.lastName || 'Unassigned';

    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      description: t.description || '',
      status: t.status || 'Open',
      statusType: t.statusType || 'Open',
      contactName: tName,
      phone: tPhone,
      email: tEmail,
      priority: t.priority || 'Medium',
      category: t.category || 'General',
      assigneeName: tAssigneeName,
      createdAt: t.createdTime,
      created_at: t.createdTime,
      updated_at: t.modifiedTime,
      closed_at: t.closedTime,
    };
  });

  if (phone) {
    return mappedTickets.filter(t => {
      const cleanTPhone = t.phone.replace(/[^0-9]/g, '');
      return (cleanTPhone && (cleanTPhone.includes(cleanPhone) || cleanPhone.includes(cleanTPhone))) ||
             (t.email && t.email.includes(cleanPhone));
    });
  }

  return mappedTickets;
}

// ─── Get Ticket Conversations ────────────────────────────────────
async function getTicketConversations(ticketId) {
  const accessToken = await getAccessToken();

  const convRes = await fetch(
    `https://desk.zoho.in/api/v1/tickets/${ticketId}/conversations?limit=50`,
    {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        ...getHeaders(),
      },
    }
  );

  if (convRes.status === 204 || convRes.status === 404) {
    return [];
  }

  const convData = await convRes.json();
  return (convData.data || []).map(c => {
    let text = c.content || c.contentText || c.summary || '';
    // Strip HTML first to get clean text representation
    text = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    // Strip automated customer satisfaction rating survey footer
    text = text.replace(/How would you rate our customer service\??\s*Good\s*Bad/gi, '').trim();

    // Truncate email thread quote headers and signatures robustly
    const delimiters = [
      /---+\s*on\s+/i,
      /---+\s*original\s*message/i,
      /on\s+.*,\s+.*,\s+.*wrote:/i,
      /on\s+.*\s+wrote\s*:/i,
      /wrote\s*-*:/i,
      /-----+\s*Original Message\s*-----+/i,
      /________________________________/
    ];

    let splitIndex = -1;
    for (const regex of delimiters) {
      const match = text.match(regex);
      if (match && match.index !== undefined) {
        if (splitIndex === -1 || match.index < splitIndex) {
          splitIndex = match.index;
        }
      }
    }
    if (splitIndex !== -1) {
      text = text.substring(0, splitIndex).trim();
    }

    return {
      id: c.id,
      type: c.type || 'reply',
      body: text,
      fromEmail: c.fromEmailAddress || '',
      author: c.author?.name || c.author?.email || 'Agent',
      isAgentReply: c.isForward === false && c.fromEmailAddress !== undefined,
      incoming: c.direction === 'in',
      created_at: c.createdTime,
    };
  });
}

// ─── Add Chat Message (Add Ticket Comment) ───────────────────────
async function addChatMessage(ticketId, message, senderName, senderType = 'user') {
  const accessToken = await getAccessToken();
  const prefix = senderType === 'agent' ? '👨‍💻' : '💬';
  const formattedMessage = `${prefix} ${senderName || 'Customer'}: ${message}`;
  const zohoRes = await fetch(`https://desk.zoho.in/api/v1/tickets/${ticketId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
      ...getHeaders(),
    },
    body: JSON.stringify({
      content: formattedMessage,
      isPublic: true,
    }),
  });

  let result = {};
  const text = await zohoRes.text();
  if (text) {
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.warn('[ZohoDesk] Failed to parse comment response:', text);
    }
  }

  if (!zohoRes.ok) {
    console.error('[ZohoDesk] Add comment error:', result);
    throw new Error(result.message || 'Failed to add comment to Zoho Desk ticket.');
  }
  return result;
}

// ─── Get Chat Messages (Get Ticket Comments & Conversations) ──────
async function getChatMessages(ticketId) {
  const accessToken = await getAccessToken();
  const headers = {
    'Authorization': `Zoho-oauthtoken ${accessToken}`,
    ...getHeaders(),
  };

  // 1. Fetch comments (user messages)
  // 1. Fetch comments (user & agent comments)
  let comments = [];
  try {
    const commRes = await fetch(
      `https://desk.zoho.in/api/v1/tickets/${ticketId}/comments?limit=100`,
      { headers }
    );
    if (commRes.ok && commRes.status !== 204) {
      const commData = await commRes.json();
      comments = (commData.data || []).map(c => {
        const rawText = c.content ? c.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
        const isAgentMsg = rawText.startsWith('👨‍💻');
        const isCustomerMsg = rawText.startsWith('💬');
        
        let text = rawText;
        let sender = 'user';
        let agentName = undefined;

        if (isAgentMsg) {
          text = rawText.replace(/^👨‍💻\s*[^:]+:\s*/, '');
          sender = 'agent';
          const match = rawText.match(/^👨‍💻\s*([^:]+):/);
          agentName = match ? match[1].trim() : 'Support Agent';
        } else if (isCustomerMsg) {
          text = rawText.replace(/^💬\s*[^:]+:\s*/, '');
          sender = 'user';
        } else {
          sender = 'agent';
          agentName = c.commenter?.name || 'Support Agent';
        }

        return {
          id: c.id,
          text: text,
          sender: sender,
          agentName: agentName,
          time: c.commentedTime || c.createdTime || new Date().toISOString(),
        };
      });
    }
  } catch (err) {
    console.error('[ZohoDesk] Error fetching comments:', err.message);
  }

  // 2. Fetch conversations/replies (agent email replies)
  let conversations = [];
  try {
    const convRes = await fetch(
      `https://desk.zoho.in/api/v1/tickets/${ticketId}/conversations?limit=50`,
      { headers }
    );
    if (convRes.ok && convRes.status !== 204) {
      const convData = await convRes.json();
      // Filter out inbound threads (customer start chat) and description threads to prevent duplicates/empty bubbles
      conversations = (convData.data || [])
        .filter(c => c.isDescriptionThread !== true && c.direction === 'out')
        .map(c => {
          let text = c.content || c.contentText || c.summary || '';
          // Strip HTML first to get clean text representation
          text = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          // Strip automated customer satisfaction rating survey footer
          text = text.replace(/How would you rate our customer service\??\s*Good\s*Bad/gi, '').trim();

          // Truncate email thread quote headers and signatures robustly
          const delimiters = [
            /---+\s*on\s+/i,
            /---+\s*original\s*message/i,
            /on\s+.*,\s+.*,\s+.*wrote:/i,
            /on\s+.*\s+wrote\s*:/i,
            /wrote\s*-*:/i,
            /-----+\s*Original Message\s*-----+/i,
            /________________________________/
          ];

          let splitIndex = -1;
          for (const regex of delimiters) {
            const match = text.match(regex);
            if (match && match.index !== undefined) {
              if (splitIndex === -1 || match.index < splitIndex) {
                splitIndex = match.index;
              }
            }
          }
          if (splitIndex !== -1) {
            text = text.substring(0, splitIndex).trim();
          }
          return {
            id: c.id,
            text: text,
            sender: 'agent',
            agentName: c.author?.name || 'Support Agent',
            time: c.createdTime || c.commentedTime || new Date().toISOString(),
          };
        });
    }
  } catch (err) {
    console.error('[ZohoDesk] Error fetching conversations:', err.message);
  }

  // 3. Fetch ticket details to retrieve active assignee info and status
  let assigneeMsg = null;
  let ticketStatus = 'Open';
  let contactPhone = null;
  let ticketNumber = null;
  try {
    const ticketRes = await fetch(
      `https://desk.zoho.in/api/v1/tickets/${ticketId}?include=assignee,contacts`,
      { headers }
    );
    if (ticketRes.ok) {
      const ticketData = await ticketRes.json();
      ticketStatus = ticketData.status || 'Open';
      ticketNumber = ticketData.ticketNumber || null;
      contactPhone = ticketData.phone || (ticketData.contact && ticketData.contact.phone) || null;
      if (ticketData.assignee && (ticketData.assignee.name || ticketData.assignee.lastName)) {
        const agentName = ticketData.assignee.name || ticketData.assignee.lastName;
        assigneeMsg = {
          id: `system-assignee-${ticketData.assignee.id}`,
          text: `Support Agent ${agentName} has joined the chat.`,
          sender: 'system',
          time: ticketData.createdTime || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.error('[ZohoDesk] Error fetching ticket assignee:', err.message);
  }

  // 4. Combine and sort
  const allMessages = [...comments, ...conversations];
  if (assigneeMsg) {
    allMessages.push(assigneeMsg);
  }
  allMessages.sort((a, b) => new Date(a.time) - new Date(b.time));

  return {
    messages: allMessages,
    status: ticketStatus,
    contactPhone,
    ticketNumber
  };
}

// ─── Close Ticket ────────────────────────────────────────────────
async function closeTicket(ticketId) {
  const accessToken = await getAccessToken();
  const headers = {
    'Authorization': `Zoho-oauthtoken ${accessToken}`,
    'Content-Type': 'application/json',
    ...getHeaders(),
  };

  const res = await fetch(`https://desk.zoho.in/api/v1/tickets/${ticketId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      status: 'Closed',
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('[ZohoDesk] Close ticket error:', data);
    throw new Error(data.message || 'Failed to close ticket on Zoho Desk.');
  }

  return true;
}

module.exports = { createTicket, listTickets, getTicketConversations, addChatMessage, getChatMessages, closeTicket };

