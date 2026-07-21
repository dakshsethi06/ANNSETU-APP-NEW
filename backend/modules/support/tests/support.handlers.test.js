const axios = require('axios');
const nodemailer = require('nodemailer');
const handlers = require('../support.handlers');
const supportTemplates = require('../support.templates');

jest.mock('axios');
jest.mock('nodemailer');
jest.mock('../support.templates', () => {
  const original = jest.requireActual('../support.templates');
  return {
    ...original,
    buildTicketDescriptionHtml: jest.fn().mockReturnValue('html_desc'),
    getMockConversationReply: jest.fn().mockReturnValue([{ id: 9901, body: 'mock_reply' }])
  };
});

describe('support.handlers unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (handlers.mockTickets) {
      handlers.mockTickets.length = 0;
    }
    process.env.FREESCOUT_URL = 'http://freescout.local/';
    process.env.FREESCOUT_API_KEY = 'api_key';
    process.env.FREESCOUT_MAILBOX_ID = '1';
    process.env.SMTP_HOST = '';
    process.env.SMTP_USER = '';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_PASS = 'pass';
  });

  describe('createTicketLive', () => {
    test('sends POST request to FreeScout API successfully', async () => {
      const mockResponse = { data: { id: 123 } };
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await handlers.createTicketLive({
        name: 'Ram',
        phone: '9876543210',
        email: 'ram@mail.com',
        category: 'Billing',
        subject: 'Query',
        description: 'Detail',
        role: 'farmer',
        attachments: [
          { name: 'file.jpg', base64: 'data:image/jpeg;base64,dGVzdA==' },
          { name: 'other.png', base64: 'dGVzdA==' } // raw base64 data
        ]
      });

      expect(axios.post).toHaveBeenCalledWith(
        'http://freescout.local/conversations',
        expect.objectContaining({
          type: 'email',
          mailboxId: 1,
          subject: '[Billing] Query',
          customer: { email: 'ram@mail.com', firstName: 'Ram', phone: '9876543210' },
          threads: [
            {
              type: 'customer',
              text: 'html_desc',
              attachments: [
                { filename: 'file.jpg', data: 'dGVzdA==' },
                { filename: 'other.png', data: 'dGVzdA==' }
              ]
            }
          ]
        }),
        expect.objectContaining({
          headers: { 'X-FreeScout-API-Key': 'api_key', 'Content-Type': 'application/json' }
        })
      );
      expect(result).toEqual({
        success: true,
        ticketId: 123,
        message: 'Ticket successfully created in FreeScout',
        source: 'freescout'
      });
    });

    test('handles missing env vars and missing email/phone gracefully', async () => {
      delete process.env.FREESCOUT_URL;
      delete process.env.FREESCOUT_MAILBOX_ID;

      axios.post.mockResolvedValueOnce({ data: { id: 456 } });

      const result = await handlers.createTicketLive({
        subject: 'S',
        description: 'D',
        attachments: [
          { base64: 'data:image/jpeg;base64,123' } // missing file.name
        ]
      });

      expect(axios.post).toHaveBeenCalledWith(
        '/conversations',
        expect.objectContaining({
          mailboxId: 1, // fallback to 1
          customer: expect.objectContaining({
            email: 'user@annsetu.mock' // fallback for missing email/phone
          }),
          threads: expect.arrayContaining([
            expect.objectContaining({
              attachments: [
                { filename: 'attachment', data: '123' } // fallback for missing filename
              ]
            })
          ])
        }),
        expect.any(Object)
      );
      expect(result.ticketId).toBe(456);
    });

    test('handles missing email but present phone to hit phone replace branch', async () => {
      axios.post.mockResolvedValueOnce({ data: { id: 789 } });

      const result = await handlers.createTicketLive({
        subject: 'S',
        description: 'D',
        phone: '123-456'
      });

      expect(axios.post).toHaveBeenCalledWith(
        'http://freescout.local/conversations',
        expect.objectContaining({
          customer: expect.objectContaining({
            email: '123456@annsetu.mock' // phone replace logic
          })
        }),
        expect.any(Object)
      );
      expect(result.ticketId).toBe(789);
    });

    test('throws error when FreeScout API call fails', async () => {
      const err = new Error('Network error');
      err.response = { data: { message: 'Freescout error' } };
      axios.post.mockRejectedValueOnce(err);

      await expect(handlers.createTicketLive({ subject: 'S', description: 'D' })).rejects.toThrow('Freescout error');
    });

    test('throws custom error message if response has no details', async () => {
      axios.post.mockRejectedValueOnce(new Error('Internal Failure'));

      await expect(handlers.createTicketLive({ subject: 'S', description: 'D' })).rejects.toThrow('Failed to connect to FreeScout. Please check backend config.');
    });
  });

  describe('createTicketMock', () => {
    test('creates mock ticket and registers SMTP email when config is present', async () => {
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_USER = 'user@gmail.com';
      process.env.SMTP_FROM = 'from@gmail.com';

      const mockSendMail = jest.fn().mockResolvedValueOnce();
      nodemailer.createTransport.mockReturnValueOnce({ sendMail: mockSendMail });

      const result = await handlers.createTicketMock({
        name: 'Ram',
        phone: '9876543210',
        email: 'ram@mail.com',
        category: 'Billing',
        subject: 'Query',
        description: 'Detail',
        role: 'farmer',
        attachments: [{ name: 'file.jpg', base64: 'dGVzdA==', type: 'image/jpeg' }]
      });

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: 'user@gmail.com', pass: 'pass' }
      });
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        from: 'from@gmail.com',
        to: 'from@gmail.com',
        subject: '[SUPPORT TICKET] [Billing] Query',
        html: 'html_desc',
        attachments: [{ filename: 'file.jpg', content: expect.any(Buffer), contentType: 'image/jpeg' }]
      }));
      expect(result.success).toBe(true);
      expect(result.source).toBe('mock');
    });

    test('creates mock ticket and falls back to SMTP_USER if SMTP_FROM is missing and default port if SMTP_PORT is missing', async () => {
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_USER = 'user@gmail.com';
      delete process.env.SMTP_FROM;
      delete process.env.SMTP_PORT;

      const mockSendMail = jest.fn().mockResolvedValueOnce();
      nodemailer.createTransport.mockReturnValueOnce({ sendMail: mockSendMail });

      await handlers.createTicketMock({ subject: 'S', description: 'D' });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
        port: 587 // fallback
      }));
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        from: 'user@gmail.com', // fallback
        to: 'user@gmail.com'
      }));
    });

    test('logs email dispatch errors during SMTP failures gracefully without throwing', async () => {
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_USER = 'user@gmail.com';

      const mockSendMail = jest.fn().mockRejectedValueOnce(new Error('SMTP down'));
      nodemailer.createTransport.mockReturnValueOnce({ sendMail: mockSendMail });
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await handlers.createTicketMock({ subject: 'S', description: 'D' });

      expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Fallback SMTP mailing error:'), 'SMTP down');
      expect(result.success).toBe(true);
      spyError.mockRestore();
    });
  });

  describe('listTicketsLive', () => {
    test('fetches conversations by phone, mapping statuses correctly', async () => {
      const mockFreescoutData = {
        conversations: [
          { id: 1, subject: 'Sub1', status: 'active', createdAt: '2026-07-14', updatedAt: '2026-07-14', threads: [{ text: 'thread1' }] },
          { id: 2, subject: 'Sub2', status: 'pending', createdAt: '2026-07-14', updatedAt: '2026-07-14', threads: [] },
          { id: 3, subject: 'Sub3', status: 'closed', createdAt: '2026-07-14', updatedAt: '2026-07-14', preview: 'preview3' },
          { id: 4, subject: 'Sub4', status: 'unknown', createdAt: '2026-07-14', updatedAt: '2026-07-14' }
        ]
      };
      axios.get.mockResolvedValueOnce({ data: mockFreescoutData });

      const result = await handlers.listTicketsLive('9876543210');

      expect(axios.get).toHaveBeenCalledWith(
        'http://freescout.local/conversations?customerPhone=9876543210&embed=threads',
        expect.any(Object)
      );
      expect(result).toEqual([
        { id: 1, subject: 'Sub1', status: 2, created_at: '2026-07-14', updated_at: '2026-07-14', description: 'thread1', category: 'Support' },
        { id: 2, subject: 'Sub2', status: 3, created_at: '2026-07-14', updated_at: '2026-07-14', description: '', category: 'Support' },
        { id: 3, subject: 'Sub3', status: 5, created_at: '2026-07-14', updated_at: '2026-07-14', description: 'preview3', category: 'Support' },
        { id: 4, subject: 'Sub4', status: 2, created_at: '2026-07-14', updated_at: '2026-07-14', description: '', category: 'Support' }
      ]);
    });

    test('handles missing env vars and missing phone gracefully, parsing response fallbacks', async () => {
      delete process.env.FREESCOUT_URL;
      
      axios.get.mockResolvedValueOnce({ data: { conversations: [{ id: 99, status: 'unknown' }] } }); // _embedded missing

      const result = await handlers.listTicketsLive(undefined); // undefined phone

      expect(axios.get).toHaveBeenCalledWith(
        '/conversations?customerPhone=&embed=threads',
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });

    test('falls back to search by mock email if phone lookup yields no conversations', async () => {
      axios.get
        .mockResolvedValueOnce({ data: { conversations: [] } }) // empty phone search
        .mockResolvedValueOnce({ data: { _embedded: { conversations: [{ id: 10, subject: 'Sub Email', status: 'active' }] } } }); // email search success

      const result = await handlers.listTicketsLive('9876543210');

      expect(axios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('customerPhone=9876543210'), expect.any(Object));
      expect(axios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('customerEmail=9876543210%40annsetu.mock'), expect.any(Object));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(10);
    });

    test('handles fallback email search when phone is missing completely and response is empty', async () => {
      axios.get
        .mockResolvedValueOnce({ data: {} }) // empty phone search with completely missing arrays
        .mockResolvedValueOnce({ data: {} }); // email search success with completely missing arrays

      const result = await handlers.listTicketsLive(undefined);

      expect(axios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('customerEmail=user%40annsetu.mock'), expect.any(Object));
      expect(result).toHaveLength(0);
    });

    test('throws error on list live API failures', async () => {
      axios.get.mockRejectedValueOnce(new Error('API failed'));

      await expect(handlers.listTicketsLive('9876543210')).rejects.toThrow('Failed to retrieve tickets from FreeScout.');
    });
  });

  describe('listTicketsMock', () => {
    test('filters mockTickets in-memory by phone match', async () => {
      // Create mock tickets first
      await handlers.createTicketMock({ phone: '9876543210', subject: 'Match 1', description: 'D1' });
      await handlers.createTicketMock({ phone: '1111111111', subject: 'No Match', description: 'D2' });

      const result = await handlers.listTicketsMock('9876543210');

      expect(result).toHaveLength(1);
      expect(result[0].subject).toContain('Match 1');
    });

    test('handles missing phones gracefully', async () => {
      // Create mock ticket with missing phone
      await handlers.createTicketMock({ phone: undefined, subject: 'No Phone', description: 'D3' });

      const result = await handlers.listTicketsMock(undefined); // search with undefined phone
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTicketConversationsLive', () => {
    test('fetches threads list and maps properties successfully', async () => {
      const mockFreescoutData = {
        threads: [
          { id: 1, type: 'customer', text: 'cust message', createdAt: '2026-07-14' },
          { id: 2, type: 'agent', createdBy: { type: 'customer' }, text: 'other message', createdAt: '2026-07-14' },
          { id: 3, type: 'reply', createdBy: { type: 'user' }, text: 'agent reply', createdAt: '2026-07-14' }
        ]
      };
      axios.get.mockResolvedValueOnce({ data: mockFreescoutData });

      const result = await handlers.getTicketConversationsLive('123');

      expect(axios.get).toHaveBeenCalledWith('http://freescout.local/conversations/123?embed=threads', expect.any(Object));
      expect(result).toEqual([
        { id: 1, body: 'cust message', body_text: 'cust message', created_at: '2026-07-14', incoming: true },
        { id: 2, body: 'other message', body_text: 'other message', created_at: '2026-07-14', incoming: true },
        { id: 3, body: 'agent reply', body_text: 'agent reply', created_at: '2026-07-14', incoming: false }
      ]);
    });

    test('handles missing env vars and missing thread texts gracefully', async () => {
      delete process.env.FREESCOUT_URL;

      const mockFreescoutData = {
        threads: [
          { id: 4, type: 'note', createdAt: '2026-07-14' } // missing text
        ]
      };
      axios.get.mockResolvedValueOnce({ data: mockFreescoutData });

      const result = await handlers.getTicketConversationsLive('123');

      expect(axios.get).toHaveBeenCalledWith('/conversations/123?embed=threads', expect.any(Object));
      expect(result[0].body).toBe('');
    });

    test('handles missing threads gracefully', async () => {
      axios.get.mockResolvedValueOnce({ data: {} }); // missing threads

      const result = await handlers.getTicketConversationsLive('123');

      expect(result).toEqual([]);
    });

    test('throws error when thread retrieval fails', async () => {
      axios.get.mockRejectedValueOnce(new Error('Failed'));

      await expect(handlers.getTicketConversationsLive('123')).rejects.toThrow('Failed to retrieve conversations from FreeScout.');
    });
  });

  test('getTicketConversationsMock returns templates array', async () => {
    const result = await handlers.getTicketConversationsMock();
    expect(result).toEqual([{ id: 9901, body: 'mock_reply' }]);
  });
});
