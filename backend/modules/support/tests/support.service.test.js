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

    test('derives fallback email when both email and phone are missing, handles missing ticketNumber in response', async () => {
      mockFetchHandlers['v1/tickets'] = (url, opts) => {
        const parsed = JSON.parse(opts.body);
        expect(parsed.email).toBe('user@annsetu.com'); // fallback
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ id: '555' }) // missing ticketNumber
        });
      };

      const service = require('../support.service');
      const result = await service.createTicket({
        subject: 'Sub', description: 'Desc' // no email, no phone
      });

      expect(result.ticketId).toBe('555');
    });

    test('derives fallback email when email is missing but phone is present', async () => {
      mockFetchHandlers['v1/tickets'] = (url, opts) => {
        const parsed = JSON.parse(opts.body);
        expect(parsed.email).toBe('123456@annsetu.com'); // derived from phone
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ id: '777', ticketNumber: '12' })
        });
      };

      const service = require('../support.service');
      const result = await service.createTicket({
        subject: 'Sub', description: 'Desc', phone: '123-456'
      });
      expect(result.ticketId).toBe('12');
    });

    test('throws default message when ticket creation response is not ok and message is missing', async () => {
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: false,
        status: 400,
        json: async () => ({}) // missing message
      });

      const service = require('../support.service');
      await expect(service.createTicket({ subject: 'S', description: 'D' }))
        .rejects.toThrow('Failed to create ticket on Zoho Desk.');
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

    test('handles completely missing data array and missing contact gracefully', async () => {
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: null // missing data array
        })
      });

      const service = require('../support.service');
      let result = await service.listTickets();
      expect(result).toEqual([]);

      // Now with missing contact
      mockFetchHandlers['v1/tickets'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 't99' }] // missing contact, missing assignee
        })
      });

      result = await service.listTickets();
      expect(result).toHaveLength(1);
      expect(result[0].contactName).toBe('App User');
      expect(result[0].assigneeName).toBe('Unassigned');
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

    test('handles missing arrays and missing fields in getTicketConversations safely', async () => {
      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'c10' } // missing content, contentText, summary, author, type, isForward
          ]
        })
      });

      const service = require('../support.service');
      const result = await service.getTicketConversations('t1');

      expect(result).toHaveLength(1);
      expect(result[0].body).toBe(''); // default fallback
      expect(result[0].type).toBe('reply'); // default fallback
      expect(result[0].author).toBe('Agent'); // default fallback
    });

    test('handles missing fromEmailAddress for isAgentReply false branch', async () => {
      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'c11', isForward: false } // fromEmailAddress is undefined
          ]
        })
      });

      const service = require('../support.service');
      const result = await service.getTicketConversations('t1');

      expect(result[0].isAgentReply).toBe(false); // falls back to false
    });

    test('returns empty array when missing data completely', async () => {
      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: null })
      });

      const service = require('../support.service');
      const result = await service.getTicketConversations('t1');
      expect(result).toEqual([]);
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

    test('throws default error if comment request fails without message, text is empty', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({
        ok: false,
        status: 400,
        text: async () => ''
      });

      const service = require('../support.service');
      await expect(service.addChatMessage('ticket1', 'msg'))
        .rejects.toThrow('Failed to add comment to Zoho Desk ticket.');
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

    test('handles completely missing fields and arrays gracefully in getChatMessages', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'c99' } // missing content
          ]
        })
      });

      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'v99', direction: 'out', contentText: 'some text' } // missing content, summary
          ]
        })
      });

      mockFetchHandlers['v1/tickets/t1'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}) // missing everything
      });

      const service = require('../support.service');
      const result = await service.getChatMessages('t1');

      expect(result.status).toBe('Open'); // fallback
      expect(result.ticketNumber).toBeNull();
      expect(result.contactPhone).toBeNull();
      expect(result.messages).toHaveLength(2); // 1 empty comment, 1 conversation
      
      const emptyComment = result.messages.find(m => m.id === 'c99');
      expect(emptyComment.text).toBe('');
      expect(emptyComment.sender).toBe('agent'); // fallback to agent for empty text

      const convMsg = result.messages.find(m => m.id === 'v99');
      expect(convMsg.text).toBe('some text');
      expect(convMsg.agentName).toBe('Support Agent');
    });

    test('handles completely missing data arrays in comments and conversations', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: null })
      });

      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: null })
      });

      mockFetchHandlers['v1/tickets/t1'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ contact: {} }) // hit contact.phone fallback
      });

      const service = require('../support.service');
      const result = await service.getChatMessages('t1');

      expect(result.messages).toHaveLength(0);
    });

    test('handles 204 No Content responses from comments and conversations and !ok ticket response', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({ ok: true, status: 204 });
      mockFetchHandlers['conversations'] = () => Promise.resolve({ ok: true, status: 204 });
      mockFetchHandlers['v1/tickets/t1'] = () => Promise.resolve({ ok: false, status: 404 }); // !ok

      const service = require('../support.service');
      const result = await service.getChatMessages('t1');

      expect(result.messages).toHaveLength(0);
      expect(result.status).toBe('Open');
    });

    test('handles agent name regex match failure and assignee without names', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'c101', content: '👨‍💻 no colon format' } // starts with agent emoji but no colon to match regex
          ]
        })
      });

      mockFetchHandlers['conversations'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'v101', direction: 'out', isDescriptionThread: false } // no content, contentText, summary
          ]
        })
      });

      mockFetchHandlers['v1/tickets/t1'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          assignee: { id: 'a99' } // has assignee but no name or lastName
        })
      });

      const service = require('../support.service');
      const result = await service.getChatMessages('t1');

      const noColonAgent = result.messages.find(m => m.id === 'c101');
      expect(noColonAgent.agentName).toBe('Support Agent'); // regex match failed fallback
      expect(noColonAgent.text).toBe('👨‍💻 no colon format');

      const emptyConv = result.messages.find(m => m.id === 'v101');
      expect(emptyConv.text).toBe('');
      
      // Should not have assigneeMsg because assignee had no name
      const assigneeMsg = result.messages.find(m => m.id.includes('system-assignee'));
      expect(assigneeMsg).toBeUndefined();
    });

    test('handles assignee fallback to lastName and missing ticket createdTime', async () => {
      mockFetchHandlers['comments'] = () => Promise.resolve({ ok: true, status: 204 });
      mockFetchHandlers['conversations'] = () => Promise.resolve({ ok: true, status: 204 });
      
      mockFetchHandlers['v1/tickets/t1'] = () => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          assignee: { id: 'a99', lastName: 'Smith' } // hits lastName fallback, createdTime missing
        })
      });

      const service = require('../support.service');
      const result = await service.getChatMessages('t1');

      const assigneeMsg = result.messages.find(m => m.id.includes('system-assignee'));
      expect(assigneeMsg).toBeDefined();
      expect(assigneeMsg.text).toBe('Support Agent Smith has joined the chat.');
      expect(assigneeMsg.time).toBeDefined(); // should be current ISO string
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
