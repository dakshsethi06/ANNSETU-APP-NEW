const express = require('express');
const router = express.Router();

// ─── Zoho Desk OAuth Token Management ────────────────────────────
let cachedAccessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  // Return cached token if still valid (with 5 min buffer)
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

// ─── Create Ticket ───────────────────────────────────────────────
router.post('/tickets', async (req, res) => {
  try {
    const { subject, description, category, contactName, email, phone, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required.' });
    }

    const accessToken = await getAccessToken();
    const orgId = process.env.ZOHO_DESK_ORG_ID;
    const departmentId = process.env.ZOHO_DESK_DEPARTMENT_ID;

    const ticketData = {
      subject,
      description,
      departmentId,
      category: category || 'General',
      priority: priority || 'Medium',
      channel: 'Phone',
      contact: {
        lastName: contactName || 'App User',
        email: email || undefined,
        phone: phone || undefined,
      },
    };

    const zohoRes = await fetch('https://desk.zoho.in/api/v1/tickets', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'orgId': orgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketData),
    });

    const result = await zohoRes.json();

    if (!zohoRes.ok) {
      console.error('[ZohoDesk] Create ticket error:', result);
      return res.status(zohoRes.status).json({ error: result.message || 'Failed to create ticket.' });
    }

    console.log('[ZohoDesk] Ticket created:', result.ticketNumber);
    return res.status(201).json({
      success: true,
      ticketId: result.ticketNumber,
      id: result.id,
      subject: result.subject,
      status: result.status,
    });
  } catch (err) {
    console.error('[ZohoDesk] Error creating ticket:', err.message);
    return res.status(500).json({ error: 'Internal server error creating ticket.' });
  }
});

// ─── Get Tickets by Phone ────────────────────────────────────────
router.get('/tickets', async (req, res) => {
  try {
    const { phone, email } = req.query;
    const accessToken = await getAccessToken();
    const orgId = process.env.ZOHO_DESK_ORG_ID;

    // Search tickets by phone or email
    const searchField = phone ? `phone:${phone}` : email ? `email:${email}` : null;
    if (!searchField) {
      return res.status(400).json({ error: 'Phone or email query param required.' });
    }

    const zohoRes = await fetch(
      `https://desk.zoho.in/api/v1/tickets/search?limit=20&sortBy=createdTime&${phone ? `phone=${phone}` : `email=${email}`}`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'orgId': orgId,
        },
      }
    );

    const result = await zohoRes.json();

    if (!zohoRes.ok) {
      // If no results, return empty array
      if (zohoRes.status === 204 || zohoRes.status === 404) {
        return res.json({ tickets: [] });
      }
      console.error('[ZohoDesk] Get tickets error:', result);
      return res.status(zohoRes.status).json({ error: result.message || 'Failed to fetch tickets.' });
    }

    const tickets = (result.data || []).map(t => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      category: t.category,
      createdTime: t.createdTime,
      closedTime: t.closedTime,
    }));

    return res.json({ tickets });
  } catch (err) {
    console.error('[ZohoDesk] Error fetching tickets:', err.message);
    return res.status(500).json({ error: 'Internal server error fetching tickets.' });
  }
});

module.exports = router;
