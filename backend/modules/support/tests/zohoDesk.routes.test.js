const express = require('express');
const request = require('supertest');

describe('zohoDesk.routes unit tests', () => {
  let app;
  let originalFetch;
  let mockFetchHandlers = {};

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn((url, options) => {
      console.log('FETCH MOCK CALLED FOR URL:', url);
      for (const pattern of Object.keys(mockFetchHandlers)) {
        if (url.includes(pattern)) {
          return mockFetchHandlers[pattern](url, options);
        }
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
        text: async () => 'Not Found'
      });
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockFetchHandlers = {};

    const zohoDeskRoutes = require('../zohoDesk.routes');

    app = express();
    app.use(express.json());
    app.use('/zoho', zohoDeskRoutes);

    process.env.ZOHO_DESK_CLIENT_ID = 'id';
    process.env.ZOHO_DESK_CLIENT_SECRET = 'secret';
    process.env.ZOHO_DESK_REFRESH_TOKEN = 'refresh';
    process.env.ZOHO_DESK_ORG_ID = 'org';
    process.env.ZOHO_DESK_DEPARTMENT_ID = 'dept';

    // Default OAuth mock
    mockFetchHandlers['oauth/v2/token'] = () => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'tok_123', expires_in: 3600 })
    });
  });

  describe('OAuth Token caching / expiry', () => {
    test('reuses cached token if not expired', async () => {
      mockFetchHandlers['api/v1/tickets'] = () => Promise.resolve({
        ok: true,
        status: 201,
        json: async () => ({ id: '1', ticketNumber: '100' })
      });

      // Call ticket creation twice
      const body = { subject: 'S', description: 'D' };
      await request(app).post('/zoho/tickets').send(body);
      await request(app).post('/zoho/tickets').send(body);

      const tokenCalls = global.fetch.mock.calls.filter(c => c[0].includes('oauth/v2/token'));
      expect(tokenCalls).toHaveLength(1);
    });

    test('refreshes token if error is returned from token call', async () => {
      mockFetchHandlers['oauth/v2/token'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ error: 'invalid_client' })
      });
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const body = { subject: 'S', description: 'D' };
      const res = await request(app).post('/zoho/tickets').send(body);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error creating ticket.' });
      expect(spyError).toHaveBeenCalled();
      spyError.mockRestore();
    });
  });

  describe('POST /tickets', () => {
    test('returns 400 when subject or description is missing', async () => {
      const res = await request(app).post('/zoho/tickets').send({ subject: 'S' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    test('creates Zoho ticket successfully', async () => {
      mockFetchHandlers['api/v1/tickets'] = (url, opts) => {
        expect(opts.headers['Authorization']).toBe('Zoho-oauthtoken tok_123');
        expect(opts.headers['orgId']).toBe('org');
        const parsed = JSON.parse(opts.body);
        expect(parsed.departmentId).toBe('dept');
        expect(parsed.category).toBe('Billing');
        expect(parsed.contact.lastName).toBe('Ram');
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ id: 'zoho_id', ticketNumber: 'TK-12', subject: 'S', status: 'Open' })
        });
      };

      const res = await request(app).post('/zoho/tickets').send({
        subject: 'S',
        description: 'D',
        category: 'Billing',
        priority: 'High',
        contactName: 'Ram',
        email: 'ram@mail.com',
        phone: '9876543210'
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        ticketId: 'TK-12',
        id: 'zoho_id',
        subject: 'S',
        status: 'Open'
      });
    });

    test('returns Zoho Desk non-ok error statuses', async () => {
      mockFetchHandlers['api/v1/tickets'] = () => Promise.resolve({
        ok: false,
        status: 422,
        json: async () => ({ message: 'Validation failed' })
      });

      const res = await request(app).post('/zoho/tickets').send({ subject: 'S', description: 'D' });
      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Validation failed');
    });

    test('returns fallback error message if message is missing', async () => {
      mockFetchHandlers['api/v1/tickets'] = () => Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      const res = await request(app).post('/zoho/tickets').send({ subject: 'S', description: 'D' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create ticket.');
    });
  });

  describe('GET /tickets', () => {
    test('returns 400 when phone and email query parameters are missing', async () => {
      const res = await request(app).get('/zoho/tickets');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    test('searches tickets by phone', async () => {
      mockFetchHandlers['tickets/search'] = (url) => {
        expect(url).toContain('phone=9876543210');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { id: '1', ticketNumber: 'T1', subject: 'Sub', status: 'Open', priority: 'Medium', category: 'General', createdTime: '2026', closedTime: null }
            ]
          })
        });
      };

      const res = await request(app).get('/zoho/tickets').query({ phone: '9876543210' });
      expect(res.status).toBe(200);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body.tickets[0].ticketNumber).toBe('T1');
    });

    test('searches tickets by email', async () => {
      mockFetchHandlers['tickets/search'] = (url) => {
        expect(url).toContain('email=ram@mail.com');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        });
      };

      const res = await request(app).get('/zoho/tickets').query({ email: 'ram@mail.com' });
      expect(res.status).toBe(200);
      expect(res.body.tickets).toEqual([]);
    });

    test('returns empty array when search status is 204 or 404', async () => {
      mockFetchHandlers['tickets/search'] = () => Promise.resolve({
        ok: false,
        status: 204,
        json: async () => ({})
      });

      const res = await request(app).get('/zoho/tickets').query({ phone: '9876543210' });
      expect(res.status).toBe(200);
      expect(res.body.tickets).toEqual([]);
    });

    test('returns non-ok search error status code from Zoho Desk', async () => {
      mockFetchHandlers['tickets/search'] = () => Promise.resolve({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad format' })
      });

      const res = await request(app).get('/zoho/tickets').query({ phone: '9876543210' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad format');
    });

    test('returns fallback error message if message is missing in search', async () => {
      mockFetchHandlers['tickets/search'] = () => Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      const res = await request(app).get('/zoho/tickets').query({ phone: '9876543210' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch tickets.');
    });

    test('handles missing result.data gracefully', async () => {
      mockFetchHandlers['tickets/search'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}) // missing data
      });

      const res = await request(app).get('/zoho/tickets').query({ phone: '9876543210' });
      expect(res.status).toBe(200);
      expect(res.body.tickets).toEqual([]);
    });

    test('returns 500 when searching tickets fails completely due to generic error', async () => {
      mockFetchHandlers['tickets/search'] = () => Promise.reject(new Error('Search failed'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/zoho/tickets').query({ phone: '9876543210' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error fetching tickets.');
      spyError.mockRestore();
    });
  });
});
