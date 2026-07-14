const supportService = require('../support.service');

describe('support.service unit tests', () => {
  let originalFetch;
  let mockFetchHandlers = {};

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn((url, options) => {
      // Find matching mock handler
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

    process.env.ZOHO_DESK_CLIENT_ID = 'client_id';
    process.env.ZOHO_DESK_CLIENT_SECRET = 'client_secret';
    process.env.ZOHO_DESK_REFRESH_TOKEN = 'refresh_token';
    process.env.ZOHO_DESK_ORG_ID = 'org_id';
    process.env.ZOHO_DESK_DEPARTMENT_ID = 'dept_id';

    // Default OAuth Token Handler
    mockFetchHandlers['oauth/v2/token'] = () => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'valid_access_token', expires_in: 3600 })
    });
  });

  describe('getAccessToken', () => {
    test('fetches access token on first call and caches it', async () => {
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ id: 'ticket_id', ticketNumber: '100' })
      });

      const service = require('../support.service');
      await service.createTicket({ subject: 'Sub', description: 'Desc' });

      // First fetch should be accounts oauth token request
      expect(global.fetch).toHaveBeenCalledWith('https://accounts.zoho.in/oauth/v2/token', expect.any(Object));
    });

    test('reuses cached access token if valid and not close to expiry', async () => {
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ id: 'ticket_id', ticketNumber: '100' })
      });

      const service = require('../support.service');
      await service.createTicket({ subject: 'Sub1', description: 'Desc' });
      await service.createTicket({ subject: 'Sub2', description: 'Desc' });

      const tokenCalls = global.fetch.mock.calls.filter(c => c[0] === 'https://accounts.zoho.in/oauth/v2/token');
      expect(tokenCalls).toHaveLength(1);
    });

    test('throws error if token refresh fails with error from Zoho Accounts', async () => {
      mockFetchHandlers['oauth/v2/token'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ error: 'invalid_grant' })
      });
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const service = require('../support.service');
      await expect(service.createTicket({ subject: 'Sub', description: 'Desc' }))
        .rejects.toThrow('Zoho token error: invalid_grant');
      
      expect(spyError).toHaveBeenCalledWith(expect.any(String), { error: 'invalid_grant' });
      spyError.mockRestore();
    });
  });

  describe('createTicket', () => {
    test('calls create ticket API and returns ticket parameters', async () => {
      mockFetchHandlers['v1/tickets'] = (url, opts) => {
        expect(opts.method).toBe('POST');
        expect(opts.headers['Authorization']).toBe('Zoho-oauthtoken valid_access_token');
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ id: '12345', ticketNumber: '99988' })
        });
      };

      const service = require('../support.service');
      const result = await service.createTicket({
        name: 'Ram',
        phone: '9876543210',
        email: 'ram@mail.com',
        category: 'Live Chat',
        subject: 'My Sub',
        description: 'My Desc',
        role: 'farmer',
        channel: 'Chat'
      });

      expect(result).toEqual({
        ticketId: '99988',
        zohoId: '12345',
        message: 'Ticket #99988 created successfully.',
        source: 'zoho_desk'
      });
    });

    test('handles missing optional fields and derives placeholders safely', async () => {
      mockFetchHandlers['v1/tickets'] = (url, opts) => {
        const parsed = JSON.parse(opts.body);
        expect(parsed.email).toBe('user@annsetu.com');
        expect(parsed.contact.lastName).toBe('App User');
        expect(parsed.cf.cf_role).toBe('farmer');
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ id: '12345', ticketNumber: '99988' })
        });
      };

      const service = require('../support.service');
      await service.createTicket({
        subject: 'My Sub',
        description: 'My Desc'
      });
    });

    test('throws custom message when ticket creation response is not ok', async () => {
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Dept id is wrong' })
      });

      const service = require('../support.service');
      await expect(service.createTicket({ subject: 'S', description: 'D' }))
        .rejects.toThrow('Dept id is wrong');
    });
  });

  describe('listTickets', () => {
    test('returns ticket items mapped properly, filtering by phone/email suffix when query phone is supplied', async () => {
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 't1', ticketNumber: '1', subject: 'A', createdTime: '2026-07-14', contact: { phone: '9876543210', lastName: 'Ram' }, assignee: { name: 'Agent X' } },
            { id: 't2', ticketNumber: '2', subject: 'B', createdTime: '2026-07-14', contact: { email: '9876543210@annsetu.com' } },
            { id: 't3', ticketNumber: '3', subject: 'C', createdTime: '2026-07-14', contact: { phone: '1111111111' } }
          ]
        })
      });

      const service = require('../support.service');
      const result = await service.listTickets('9876543210');

      expect(result).toHaveLength(2); // matches t1 and t2 (since its email has the digits)
      expect(result[0].id).toBe('t1');
      expect(result[0].assigneeName).toBe('Agent X');
      expect(result[1].id).toBe('t2');
    });

    test('returns empty array if response is 204 or 404', async () => {
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: true,
        status: 204,
        json: async () => ({})
      });

      const service = require('../support.service');
      const result = await service.listTickets();

      expect(result).toEqual([]);
    });

    test('returns all mapped tickets when listTickets is called without a phone filter', async () => {
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 't1', ticketNumber: '1', subject: 'A', createdTime: '2026-07-14', contact: { phone: '9876543210' } }
          ]
        })
      });

      const service = require('../support.service');
      const result = await service.listTickets();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });
  });

  describe('getTicketConversations', () => {
    test('cleans up html tags, feedback survey footers, and email quote headers', async () => {
      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'c1', content: 'hello &nbsp; <p>world</p><br/>How would you rate our customer service? Good Bad --- on 2026-07-14', fromEmailAddress: 'cust@mail.com', direction: 'in', createdTime: '2026' },
            { id: 'c2', content: 'second message --- original message text', direction: 'out', createdTime: '2026' },
            { id: 'c3', content: 'third message on 2026-07-14, at 10am wrote: test', direction: 'out', createdTime: '2026' },
            { id: 'c4', content: 'fourth message wrote:', direction: 'out', createdTime: '2026' },
            { id: 'c5', content: 'fifth message ----- Original Message -----', direction: 'out', createdTime: '2026' },
            { id: 'c6', content: 'sixth message ________________________________', direction: 'out', createdTime: '2026' }
          ]
        })
      });

      const service = require('../support.service');
      const result = await service.getTicketConversations('ticket1');

      expect(result).toHaveLength(6);
      expect(result[0].body).toBe('hello   world');
      expect(result[1].body).toBe('second message');
      expect(result[2].body).toBe('third message');
      expect(result[3].body).toBe('fourth message');
      expect(result[4].body).toBe('fifth message');
      expect(result[5].body).toBe('sixth message');
    });

    test('returns empty array if response is 204 or 404', async () => {
      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 404,
        json: async () => ({})
      });

      const service = require('../support.service');
      const result = await service.getTicketConversations('t1');

      expect(result).toEqual([]);
    });
  });

  describe('addChatMessage', () => {
    test('adds public comment to ticket', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ id: 'comm1' })
      });

      const service = require('../support.service');
      const result = await service.addChatMessage('ticket1', 'msg', 'Ram', 'agent');

      expect(result).toEqual({ id: 'comm1' });
    });

    test('handles non-JSON responses from Zoho comment endpoint safely', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({
        ok: true,
        status: 201,
        text: async () => 'Plain text warning response'
      });

      const service = require('../support.service');
      const result = await service.addChatMessage('ticket1', 'msg', 'Ram', 'user');

      expect(result).toEqual({});
    });

    test('throws error if comment request fails', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Write access denied' })
      });

      const service = require('../support.service');
      await expect(service.addChatMessage('ticket1', 'msg'))
        .rejects.toThrow('Write access denied');
    });
  });

  describe('getChatMessages', () => {
    test('combines comments, conversations and ticket details correctly', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'c1', content: '👨‍💻 Agent: hello', commentedTime: '2026-07-14T10:00:00Z' },
            { id: 'c2', content: '💬 User: hi', commenter: { name: 'Customer' }, commentedTime: '2026-07-14T09:00:00Z' },
            { id: 'c3', content: 'normal comment without emojis', commenter: { name: 'Other Agent' }, commentedTime: '2026-07-14T08:00:00Z' }
          ]
        })
      });

      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'v1', content: 'agent email response --- on wednesday Ram wrote:', isDescriptionThread: false, direction: 'out', author: { name: 'Email Agent' }, createdTime: '2026-07-14T11:00:00Z' }
          ]
        })
      });

      // Match exact ticket detail URL specifically (which is just the ticket ID pattern without comment/conversation suffix)
      mockFetchHandlers['v1/tickets/t1'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'Closed',
          ticketNumber: '7765',
          phone: '9876543210',
          createdTime: '2026-07-14T07:00:00Z',
          assignee: { id: 'a123', name: 'Agent Bob' }
        })
      });

      const service = require('../support.service');
      const result = await service.getChatMessages('t1');

      expect(result.status).toBe('Closed');
      expect(result.ticketNumber).toBe('7765');
      expect(result.contactPhone).toBe('9876543210');
      expect(result.messages).toHaveLength(5); // 3 comments + 1 conversation + 1 assignee message
      
      expect(result.messages[0].id).toContain('system-assignee');
      expect(result.messages[1].id).toBe('c3');
      expect(result.messages[2].id).toBe('c2');
      expect(result.messages[3].id).toBe('c1');
      expect(result.messages[4].id).toBe('v1');
    });

    test('logs failures and skips steps without failing the overall call', async () => {
      mockFetchHandlers['comments'] = () => Promise.reject(new Error('Comments error'));
      mockFetchHandlers['conversations'] = () => Promise.reject(new Error('Conversations error'));
      mockFetchHandlers['v1/tickets/t1'] = () => Promise.reject(new Error('Ticket error'));

      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const service = require('../support.service');
      const result = await service.getChatMessages('t1');

      expect(result.messages).toEqual([]);
      expect(result.status).toBe('Open'); // defaults
      expect(spyError).toHaveBeenCalledTimes(3);

      spyError.mockRestore();
    });
  });

  describe('closeTicket', () => {
    test('sends status Closed patch update successfully', async () => {
      mockFetchHandlers['v1/tickets/ticket_id'] = (url, opts) => {
        expect(opts.method).toBe('PATCH');
        expect(JSON.parse(opts.body)).toEqual({ status: 'Closed' });
        return Promise.resolve({
          ok: true,
          status: 200
        });
      };

      const service = require('../support.service');
      const result = await service.closeTicket('ticket_id');

      expect(result).toBe(true);
    });

    test('throws failure details on patch error responses', async () => {
      mockFetchHandlers['v1/tickets/ticket_id'] = () => Promise.resolve({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Cannot modify closed ticket' })
      });

      const service = require('../support.service');
      await expect(service.closeTicket('ticket_id')).rejects.toThrow('Cannot modify closed ticket');
    });

    test('handles fallback error messages when JSON parsing fails during request error state', async () => {
      mockFetchHandlers['v1/tickets/ticket_id'] = () => Promise.resolve({
        ok: false,
        status: 400,
        json: async () => { throw new Error('parse error'); }
      });

      const service = require('../support.service');
      await expect(service.closeTicket('ticket_id')).rejects.toThrow('Failed to close ticket on Zoho Desk.');
    });
  });
});
