const notificationController = require('../notification.controller');
const notificationService = require('../notification.service');

jest.mock('../notification.service');

describe('notification.controller unit tests', () => {
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

  describe('getNotifications', () => {
    test('returns 200 and notifications on success', async () => {
      req = { query: { farmerId: 'farmer123' } };
      const mockNotifs = [{ id: 'notif1', title: 'Hello' }];
      notificationService.fetchNotifications.mockResolvedValueOnce(mockNotifs);

      await notificationController.getNotifications(req, res);

      expect(notificationService.fetchNotifications).toHaveBeenCalledWith('farmer123');
      expect(res.json).toHaveBeenCalledWith({ success: true, notifications: mockNotifs });
    });

    test('returns 500 when fetchNotifications throws an error', async () => {
      req = { query: { farmerId: 'farmer123' } };
      notificationService.fetchNotifications.mockRejectedValueOnce(new Error('Fetch failed'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationController.getNotifications(req, res);

      expect(spyError).toHaveBeenCalledWith(expect.any(String), 'Fetch failed');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to fetch notifications' });
      spyError.mockRestore();
    });
  });

  describe('markAsRead', () => {
    test('returns 200 and result on success', async () => {
      req = { params: { id: 'notif123' } };
      const mockResult = { message: 'Notification deleted' };
      notificationService.markNotificationRead.mockResolvedValueOnce(mockResult);

      await notificationController.markAsRead(req, res);

      expect(notificationService.markNotificationRead).toHaveBeenCalledWith('notif123');
      expect(res.json).toHaveBeenCalledWith({ success: true, ...mockResult });
    });

    test('returns dynamic status code if error.statusCode exists', async () => {
      req = { params: { id: 'notif123' } };
      const err = new Error('Not found');
      err.statusCode = 404;
      notificationService.markNotificationRead.mockRejectedValueOnce(err);
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationController.markAsRead(req, res);

      expect(spyError).toHaveBeenCalledWith(expect.any(String), 'Not found');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Not found' });
      spyError.mockRestore();
    });

    test('defaults status to 500 and uses custom fallback error message on failure', async () => {
      req = { params: { id: 'notif123' } };
      const err = new Error(''); // no message
      notificationService.markNotificationRead.mockRejectedValueOnce(err);
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to mark notification as read' });
      spyError.mockRestore();
    });
  });

  describe('registerPushToken', () => {
    test('returns 200 on success', async () => {
      req = { body: { userId: 'user123', pushToken: 'token123' } };
      notificationService.registerUserPushToken.mockResolvedValueOnce();

      await notificationController.registerPushToken(req, res);

      expect(notificationService.registerUserPushToken).toHaveBeenCalledWith('user123', 'token123');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Push token registered successfully.' });
    });

    test('returns 500 when registerUserPushToken throws', async () => {
      req = { body: { userId: 'user123', pushToken: 'token123' } };
      notificationService.registerUserPushToken.mockRejectedValueOnce(new Error('Register failed'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationController.registerPushToken(req, res);

      expect(spyError).toHaveBeenCalledWith(expect.any(String), 'Register failed');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Register failed' });
      spyError.mockRestore();
    });
  });

  describe('cleanupNotifications', () => {
    test('returns 200 and deleted count on success', async () => {
      req = {};
      notificationService.cleanupStaleNotifications.mockResolvedValueOnce({ deletedCount: 5 });

      await notificationController.cleanupNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Stale notifications cleaned up successfully.',
        deletedCount: 5
      });
    });

    test('returns 500 on failure', async () => {
      req = {};
      notificationService.cleanupStaleNotifications.mockRejectedValueOnce(new Error('Cleanup failed'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationController.cleanupNotifications(req, res);

      expect(spyError).toHaveBeenCalledWith(expect.any(String), 'Cleanup failed');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Failed to clean up stale notifications.' });
      spyError.mockRestore();
    });
  });
});
