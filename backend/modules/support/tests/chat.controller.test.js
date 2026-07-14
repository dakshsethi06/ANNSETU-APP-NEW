const chatController = require('../chat.controller');
const supportService = require('../support.service');
const { createAppNotification } = require('../../../shared/notifications/notifications');
const db = require('../../../config/database');
const fs = require('fs');

jest.mock('../support.service');
jest.mock('../../../shared/notifications/notifications');
jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));
jest.mock('fs');

describe('chat.controller unit tests', () => {
  let req, res, spyStatus, spyJson;
  let spyGetDay, spyGetHours;

  beforeEach(() => {
    jest.clearAllMocks();
    spyStatus = jest.fn().mockReturnThis();
    spyJson = jest.fn();
    res = {
      status: spyStatus,
      json: spyJson
    };

    // Default mock behavior for fs to avoid side effects
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.writeFileSync.mockReturnValue(undefined);

    // Default mock dates: Wednesday, 2 PM (within business hours)
    spyGetDay = jest.spyOn(Date.prototype, 'getDay').mockReturnValue(3);
    spyGetHours = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    // Clean require cache to reset notifiedClosedTickets module-level Set in chat.controller.js
    delete require.cache[require.resolve('../chat.controller')];
  });

  afterEach(() => {
    spyGetDay.mockRestore();
    spyGetHours.mockRestore();
  });

  describe('startChat', () => {
    test('returns 400 if support is offline (weekend)', async () => {
      spyGetDay.mockReturnValue(0); // Sunday
      req = { body: { name: 'Ram', phone: '9876543210' } };

      await chatController.startChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Live support is currently offline')
      });
    });

    test('returns 400 if support is offline (outside business hours)', async () => {
      spyGetHours.mockReturnValue(8); // 8 AM (too early)
      req = { body: { name: 'Ram', phone: '9876543210' } };

      await chatController.startChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('succeeds and creates ticket during working hours', async () => {
      req = { body: { name: 'Ram', phone: '9876543210', subject: 'Login problem', description: 'Cannot log in' } };
      supportService.createTicket.mockResolvedValueOnce({ zohoId: 'zoho_123', ticketId: '9988' });

      await chatController.startChat(req, res);

      expect(supportService.createTicket).toHaveBeenCalledWith({
        name: 'Ram',
        phone: '9876543210',
        category: 'Live Chat',
        subject: 'Login problem',
        description: 'Cannot log in',
        role: 'farmer',
        channel: 'Chat'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ticketId: 'zoho_123',
        message: 'Chat session started.'
      });
    });

    test('falls back to ticketId if zohoId is missing in service response', async () => {
      req = { body: {} };
      supportService.createTicket.mockResolvedValueOnce({ ticketId: '9988' });

      await chatController.startChat(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ticketId: '9988',
        message: 'Chat session started.'
      });
    });

    test('returns 500 when service creation fails', async () => {
      req = { body: {} };
      supportService.createTicket.mockRejectedValueOnce(new Error('Start error'));

      await chatController.startChat(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Start error'
      });
    });

    test('returns 500 with default message when service throws empty error', async () => {
      req = { body: {} };
      supportService.createTicket.mockRejectedValueOnce(new Error(''));

      await chatController.startChat(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to start chat session.'
      });
    });
  });

  describe('sendChatMessage', () => {
    test('returns 400 if message and attachment are missing', async () => {
      req = { params: { ticketId: 't1' }, body: {} };

      await chatController.sendChatMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Message or attachment is required.' });
    });

    test('sends text message comment successfully', async () => {
      req = {
        params: { ticketId: 't1' },
        body: { message: 'hello', senderName: 'Farmer' }
      };

      await chatController.sendChatMessage(req, res);

      expect(supportService.addChatMessage).toHaveBeenCalledWith('t1', 'hello', 'Farmer');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Message sent.' });
    });

    test('handles file attachments and writes base64 content to uploads', async () => {
      fs.existsSync.mockReturnValueOnce(false); // uploads directory does not exist
      req = {
        params: { ticketId: 't1' },
        headers: { host: 'localhost:3002' },
        body: {
          message: 'Check receipt',
          senderName: 'Farmer',
          attachment: {
            name: 'receipt.pdf',
            base64: 'data:application/pdf;base64,dGVzdA=='
          }
        }
      };

      await chatController.sendChatMessage(req, res);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(supportService.addChatMessage).toHaveBeenCalledWith(
        't1',
        expect.stringContaining('[Attachment: http://localhost:3002/uploads/'),
        'Farmer'
      );
    });

    test('handles attachment name and base64 parsing fallbacks when name is empty and base64 has no MIME prefix', async () => {
      req = {
        params: { ticketId: 't1' },
        headers: { host: 'localhost:3002' },
        body: {
          attachment: {
            base64: 'dGVzdA==' // raw base64 data without format prefix
          }
        }
      };

      await chatController.sendChatMessage(req, res);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.jpg'), // default extension fallback
        expect.any(Buffer)
      );
    });

    test('returns 500 when comment addition fails', async () => {
      req = { params: { ticketId: 't1' }, body: { message: 'hello' } };
      supportService.addChatMessage.mockRejectedValueOnce(new Error('Send failed'));

      await chatController.sendChatMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Send failed' });
    });
  });

  describe('getChatMessages', () => {
    test('returns chat messages successfully', async () => {
      req = { params: { ticketId: 't1' } };
      supportService.getChatMessages.mockResolvedValueOnce({
        messages: [{ id: '1', text: 'hello', sender: 'agent', agentName: 'Agent Bob', time: '2026' }],
        status: 'Open'
      });

      await chatController.getChatMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'Open',
        messages: [{ id: '1', text: 'hello', sender: 'agent', agentName: 'Agent Bob', time: '2026' }]
      });
    });

    test('triggers app notification when ticket status is closed', async () => {
      req = { params: { ticketId: 't1' } };
      supportService.getChatMessages.mockResolvedValueOnce({
        messages: [],
        status: 'Closed',
        contactPhone: '9876543210',
        ticketNumber: '887'
      });

      db.query.mockResolvedValueOnce({ rows: [{ id: 'farmer_123' }] });

      await chatController.getChatMessages(req, res);

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "Farmer" WHERE phone LIKE $1'), ['%9876543210']);
      expect(createAppNotification).toHaveBeenCalledWith({
        userId: 'farmer_123',
        type: 'info',
        title: 'Support Ticket Resolved',
        message: expect.stringContaining('#887'),
        icon: 'check-circle'
      });
    });

    test('does not send notification if status is closed but ticket was already notified', async () => {
      req = { params: { ticketId: 't-dup' } };
      
      // First call closed
      supportService.getChatMessages.mockResolvedValueOnce({
        messages: [],
        status: 'Closed',
        contactPhone: '9876543210',
        ticketNumber: '887'
      });
      db.query.mockResolvedValueOnce({ rows: [{ id: 'farmer_123' }] });

      await chatController.getChatMessages(req, res);
      expect(createAppNotification).toHaveBeenCalledTimes(1);

      // Second call closed - should skip notification
      supportService.getChatMessages.mockResolvedValueOnce({
        messages: [],
        status: 'Closed',
        contactPhone: '9876543210',
        ticketNumber: '887'
      });

      await chatController.getChatMessages(req, res);
      expect(createAppNotification).toHaveBeenCalledTimes(1); // call count should remain 1
    });

    test('does not send notification if contact phone is missing on closed ticket', async () => {
      req = { params: { ticketId: 't2' } };
      supportService.getChatMessages.mockResolvedValueOnce({
        messages: [],
        status: 'Closed',
        contactPhone: null
      });

      await chatController.getChatMessages(req, res);
      expect(createAppNotification).not.toHaveBeenCalled();
    });

    test('notifies farmer without ticket number fallback label if result.ticketNumber is falsy', async () => {
      req = { params: { ticketId: 't3' } };
      supportService.getChatMessages.mockResolvedValueOnce({
        messages: [],
        status: 'Closed',
        contactPhone: '9876543210',
        ticketNumber: null
      });
      db.query.mockResolvedValueOnce({ rows: [{ id: 'farmer_123' }] });

      await chatController.getChatMessages(req, res);

      expect(createAppNotification).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Your support ticket  has been resolved by our customer support team. If you need further help, feel free to reach out again!'
      }));
    });

    test('does not send notification if user sync query yields no farmer matches', async () => {
      req = { params: { ticketId: 't1' } };
      supportService.getChatMessages.mockResolvedValueOnce({
        messages: [],
        status: 'closed',
        contactPhone: '1111111111'
      });

      db.query.mockResolvedValueOnce({ rows: [] }); // no farmer found

      await chatController.getChatMessages(req, res);

      expect(createAppNotification).not.toHaveBeenCalled();
    });

    test('returns 500 when fetch fails', async () => {
      req = { params: { ticketId: 't1' } };
      supportService.getChatMessages.mockRejectedValueOnce(new Error('Fetch error'));

      await chatController.getChatMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('closeChatSession', () => {
    test('closes session and returns 200', async () => {
      req = { params: { ticketId: 't1' } };

      await chatController.closeChatSession(req, res);

      expect(supportService.closeTicket).toHaveBeenCalledWith('t1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 500 on close failure', async () => {
      req = { params: { ticketId: 't1' } };
      supportService.closeTicket.mockRejectedValueOnce(new Error('Close error'));

      await chatController.closeChatSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getActiveChatSession', () => {
    test('returns 400 when phone is missing', async () => {
      req = { query: {} };

      await chatController.getActiveChatSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns active true when active chat ticket is found', async () => {
      req = { query: { phone: '9876543210' } };
      supportService.listTickets.mockResolvedValueOnce([
        { id: '1', category: 'General', status: 'Open' },
        { id: '2', category: 'Live Chat', status: 'Closed' },
        { id: '3', category: 'Live Chat', status: 'Open', subject: 'Chat subject' }
      ]);

      await chatController.getActiveChatSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        active: true,
        ticketId: '3',
        subject: 'Chat subject'
      });
    });

    test('returns active false when no active live chat is found', async () => {
      req = { query: { phone: '9876543210' } };
      supportService.listTickets.mockResolvedValueOnce([
        { id: '1', category: 'Live Chat', status: 'Closed' }
      ]);

      await chatController.getActiveChatSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, active: false });
    });

    test('returns 500 when listTickets throws', async () => {
      req = { query: { phone: '9876543210' } };
      supportService.listTickets.mockRejectedValueOnce(new Error('Lookup error'));

      await chatController.getActiveChatSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('returns 500 with default message when listTickets throws empty error', async () => {
      req = { query: { phone: '9876543210' } };
      supportService.listTickets.mockRejectedValueOnce(new Error(''));

      await chatController.getActiveChatSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Failed to check active chat session.' });
    });
  });

  describe('submitChatFeedback', () => {
    test('returns 400 when rating is missing', async () => {
      req = { params: { ticketId: 't1' }, body: {} };

      await chatController.submitChatFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('submits rating feedback successfully', async () => {
      req = { params: { ticketId: 't1' }, body: { rating: '5', senderName: 'Farmer' } };

      await chatController.submitChatFeedback(req, res);

      expect(supportService.addChatMessage).toHaveBeenCalledWith('t1', 'Submitted Feedback Rating: 5', 'Farmer');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('returns 500 when feedback submission fails', async () => {
      req = { params: { ticketId: 't1' }, body: { rating: '5' } };
      supportService.addChatMessage.mockRejectedValueOnce(new Error('Submit error'));

      await chatController.submitChatFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('returns 500 with default message when feedback submission fails with empty error', async () => {
      req = { params: { ticketId: 't1' }, body: { rating: '5' } };
      supportService.addChatMessage.mockRejectedValueOnce(new Error(''));

      await chatController.submitChatFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Failed to submit feedback.' });
    });
  });
});
