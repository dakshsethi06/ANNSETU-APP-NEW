const supportController = require('../support.controller');
const supportService = require('../support.service');

jest.mock('../support.service');

describe('support.controller unit tests', () => {
  let req, res, spyStatus, spyJson;

  beforeEach(() => {
    jest.clearAllMocks();
    spyStatus = jest.fn().mockReturnThis();
    spyJson = jest.fn();
    res = {
      status: spyStatus,
      json: spyJson
    };
  });

  describe('createSupportTicket', () => {
    test('returns 200 and ticket details on success', async () => {
      req = {
        body: {
          name: ' Ram ',
          phone: ' 9876543210 ',
          email: ' ram@mail.com ',
          category: 'Billing',
          subject: ' Issue ',
          description: ' Help ',
          role: 'farmer',
          attachments: []
        }
      };
      const mockResult = { ticketId: '100', message: 'Created', source: 'zoho_desk' };
      supportService.createTicket.mockResolvedValueOnce(mockResult);

      await supportController.createSupportTicket(req, res);

      expect(supportService.createTicket).toHaveBeenCalledWith({
        name: 'Ram',
        phone: '9876543210',
        email: 'ram@mail.com',
        category: 'Billing',
        subject: 'Issue',
        description: 'Help',
        role: 'farmer',
        attachments: []
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ticketId: '100',
        message: 'Created',
        source: 'zoho_desk'
      });
    });

    test('handles missing optional fields safely during trimming', async () => {
      req = {
        body: {
          subject: 'S',
          description: 'D'
        }
      };
      supportService.createTicket.mockResolvedValueOnce({ ticketId: '100' });

      await supportController.createSupportTicket(req, res);

      expect(supportService.createTicket).toHaveBeenCalledWith({
        name: undefined,
        phone: undefined,
        email: undefined,
        category: undefined,
        subject: 'S',
        description: 'D',
        role: undefined,
        attachments: undefined
      });
    });

    test('returns 500 when supportService.createTicket throws an error', async () => {
      req = { body: { subject: 'S', description: 'D' } };
      supportService.createTicket.mockRejectedValueOnce(new Error('API Error'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await supportController.createSupportTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'API Error'
      });
      spyError.mockRestore();
    });

    test('returns 500 with default fallback error message when error object is falsy or has no message', async () => {
      req = { body: { subject: 'S', description: 'D' } };
      supportService.createTicket.mockRejectedValueOnce(new Error(''));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await supportController.createSupportTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected error occurred while logging support ticket.'
      });
      spyError.mockRestore();
    });
  });

  describe('getTickets', () => {
    test('returns 200 and tickets on success', async () => {
      req = { query: { phone: '9876543210' } };
      const mockTickets = [{ id: '1' }];
      supportService.listTickets.mockResolvedValueOnce(mockTickets);

      await supportController.getTickets(req, res);

      expect(supportService.listTickets).toHaveBeenCalledWith('9876543210');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, tickets: mockTickets });
    });

    test('returns 500 when listTickets throws', async () => {
      req = { query: { phone: '9876543210' } };
      supportService.listTickets.mockRejectedValueOnce(new Error('List Error'));

      await supportController.getTickets(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'List Error' });
    });

    test('returns 500 with default message on empty listTickets errors', async () => {
      req = { query: { phone: '9876543210' } };
      supportService.listTickets.mockRejectedValueOnce(new Error(''));

      await supportController.getTickets(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'An error occurred while fetching support tickets.' });
    });
  });

  describe('getConversations', () => {
    test('returns 400 if ticket ID param is missing', async () => {
      req = { params: {} };

      await supportController.getConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Ticket ID is required.' });
    });

    test('returns 200 and conversations on success', async () => {
      req = { params: { id: 'ticket123' } };
      const mockConversations = [{ id: 'c1' }];
      supportService.getTicketConversations.mockResolvedValueOnce(mockConversations);

      await supportController.getConversations(req, res);

      expect(supportService.getTicketConversations).toHaveBeenCalledWith('ticket123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, conversations: mockConversations });
    });

    test('returns 500 when getTicketConversations throws', async () => {
      req = { params: { id: 'ticket123' } };
      supportService.getTicketConversations.mockRejectedValueOnce(new Error('Conv Error'));

      await supportController.getConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Conv Error' });
    });

    test('returns 500 with default message on empty errors', async () => {
      req = { params: { id: 'ticket123' } };
      supportService.getTicketConversations.mockRejectedValueOnce(new Error(''));

      await supportController.getConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'An error occurred while fetching ticket conversations.' });
    });
  });
});
