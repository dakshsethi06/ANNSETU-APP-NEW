const notificationService = require('../notification.service');
const notificationRepository = require('../notification.repository');
const { DEFAULT_COLD_STORAGE_ID } = require('../../../config/constants');

jest.mock('../notification.repository');

describe('notification.service unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('computeTimeLabel', () => {
    test('returns "Just now" for differences less than 1 minute', async () => {
      const now = new Date();
      // fetchNotifications uses computeTimeLabel under the hood
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: '1', title: 'T', message: 'M', type: 'info', createdAt: now.toISOString(), isRead: false }
      ]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const notifs = await notificationService.fetchNotifications('F1');
      expect(notifs[0].timeLabel).toBe('Just now');
    });

    test('returns "Xm ago" for differences less than 60 minutes', async () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60000);
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: '1', title: 'T', message: 'M', type: 'info', createdAt: fiveMinsAgo.toISOString(), isRead: false }
      ]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const notifs = await notificationService.fetchNotifications('F1');
      expect(notifs[0].timeLabel).toBe('5m ago');
    });

    test('returns "Xh ago" for differences less than 24 hours', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600000);
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: '1', title: 'T', message: 'M', type: 'info', createdAt: threeHoursAgo.toISOString(), isRead: false }
      ]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const notifs = await notificationService.fetchNotifications('F1');
      expect(notifs[0].timeLabel).toBe('3h ago');
    });

    test('returns "Xd ago" for differences greater than 24 hours', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600000);
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: '1', title: 'T', message: 'M', type: 'info', createdAt: twoDaysAgo.toISOString(), isRead: false }
      ]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const notifs = await notificationService.fetchNotifications('F1');
      expect(notifs[0].timeLabel).toBe('2d ago');
    });
  });

  describe('fetchNotifications', () => {
    test('filters out read notifications and updates readNotifIds', async () => {
      const now = new Date();
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: 'bill-notif1', title: 'Title1', message: 'Message1', type: 'info', createdAt: now.toISOString(), isRead: true }
      ]);
      // bill-notif1 is marked as read, so it should not appear in pending bills even if due
      notificationRepository.getPendingBills.mockResolvedValueOnce([
        { id: 'notif1', amount: 500, createdAt: now.toISOString(), dueDate: now.toISOString() }
      ]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result).toHaveLength(0);
    });

    test('injects pending billing notifications if due date is within 15 days', async () => {
      const now = new Date();
      const dueDate = new Date(Date.now() + 10 * 24 * 3600000); // 10 days from now
      notificationRepository.getAppNotifications.mockResolvedValueOnce([]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([
        { id: 'bill123', amount: 5500.5, createdAt: now.toISOString(), dueDate: dueDate.toISOString(), periodLabel: 'June' }
      ]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'bill-bill123',
        title: 'Payment Due',
        message: 'Storage rent of ₹5,500.5 is due for June.',
        type: 'billing',
        isRead: false
      }));
    });

    test('calculates default due date as createdAt + 30 days if dueDate is missing', async () => {
      const now = new Date();
      const createdAt = new Date(Date.now() - 20 * 24 * 3600000); // 20 days ago (so default due date is +10 days from now)
      notificationRepository.getAppNotifications.mockResolvedValueOnce([]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([
        { id: 'bill123', amount: 1000, createdAt: createdAt.toISOString(), dueDate: null, periodLabel: null }
      ]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('recent storage period');
    });

    test('ignores bill notification if due date is further than 15 days out', async () => {
      const now = new Date();
      const dueDate = new Date(Date.now() + 20 * 24 * 3600000); // 20 days from now
      notificationRepository.getAppNotifications.mockResolvedValueOnce([]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([
        { id: 'bill123', amount: 500, createdAt: now.toISOString(), dueDate: dueDate.toISOString() }
      ]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result).toHaveLength(0);
    });

    test('sorts notifications by createdAt descending', async () => {
      const date1 = new Date(Date.now() - 10000);
      const date2 = new Date(Date.now());
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: 'notif1', title: 'T1', message: 'M1', type: 'info', createdAt: date1.toISOString(), isRead: false },
        { id: 'notif2', title: 'T2', message: 'M2', type: 'info', createdAt: date2.toISOString(), isRead: false }
      ]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result[0].id).toBe('notif2');
      expect(result[1].id).toBe('notif1');
    });

    test('skips stale payment verification notifications (payment does not exist)', async () => {
      const now = new Date();
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: '1', title: 'T', message: 'M', type: 'info', createdAt: now.toISOString(), isRead: false, actionUrl: '/payment-verification/pay_invalid' }
      ]);
      notificationRepository.checkPaymentExists.mockResolvedValueOnce(false); // does not exist => stale
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result).toHaveLength(0);
    });

    test('keeps payment verification notifications if payment exists', async () => {
      const now = new Date();
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: '1', title: 'T', message: 'M', type: 'info', createdAt: now.toISOString(), isRead: false, actionUrl: '/payment-verification/pay_valid' }
      ]);
      notificationRepository.checkPaymentExists.mockResolvedValueOnce(true); // exists => not stale
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result).toHaveLength(1);
    });

    test('skips stale dispatch notifications if dispatch bag count matches processed transaction', async () => {
      const now = new Date();
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: '1', title: 'Dispatch Approved', message: 'dispatch of 50 bags', type: 'info', userId: 'user1', createdAt: now.toISOString(), isRead: false }
      ]);
      notificationRepository.checkColdStorageExists.mockResolvedValueOnce(false); // is farmer
      notificationRepository.getProcessedTransactionsSql.mockResolvedValueOnce([{ packetsDispatched: 50, status: 'DELIVERED' }]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result).toHaveLength(0);
    });

    test('uses cached processed transactions on duplicate user notifications', async () => {
      const now = new Date();
      notificationRepository.getAppNotifications.mockResolvedValueOnce([
        { id: '1', title: 'Dispatch Approved', message: 'dispatch of 50 bags', type: 'info', userId: 'user1', createdAt: now.toISOString(), isRead: false },
        { id: '2', title: 'Dispatch Approved', message: 'dispatch of 50 bags', type: 'info', userId: 'user1', createdAt: now.toISOString(), isRead: false }
      ]);
      notificationRepository.checkColdStorageExists.mockResolvedValueOnce(false); // only calls checkColdStorageExists once because of map caching!
      notificationRepository.getProcessedTransactionsSql.mockResolvedValueOnce([{ packetsDispatched: 50, status: 'DELIVERED' }]);
      notificationRepository.getPendingBills.mockResolvedValueOnce([]);

      const result = await notificationService.fetchNotifications('F1');
      expect(result).toHaveLength(0);
      expect(notificationRepository.checkColdStorageExists).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupStaleNotifications', () => {
    test('deletes stale notifications and returns deletedCount', async () => {
      notificationRepository.getUnreadNotifications.mockResolvedValueOnce([
        { id: 'notif1', title: 'Dispatch', message: 'dispatch of 100 bags', userId: 'user1', isRead: false },
        { id: 'notif2', title: 'Simple alert', message: 'Some basic message', userId: 'user1', isRead: false }
      ]);
      notificationRepository.checkColdStorageExists.mockResolvedValueOnce(true); // is cold storage
      notificationRepository.getProcessedTransactionsSql.mockResolvedValueOnce([{ packetsDispatched: 100, status: 'DISPATCHED' }]);

      const result = await notificationService.cleanupStaleNotifications();
      expect(notificationRepository.deleteNotification).toHaveBeenCalledWith('notif1');
      expect(notificationRepository.deleteNotification).not.toHaveBeenCalledWith('notif2');
      expect(result.deletedCount).toBe(1);
    });
  });

  describe('markNotificationRead', () => {
    test('bill- prefix: fetches billing details, resolves cold storage, and upserts bill notification as read', async () => {
      notificationRepository.getBillingEntryDetails.mockResolvedValueOnce({
        farmerId: 'farmer123',
        amount: 2500,
        periodLabel: 'May 2026'
      });
      notificationRepository.getFarmerColdStorageId.mockResolvedValueOnce('CS_REAL');

      const result = await notificationService.markNotificationRead('bill-bill123');

      expect(notificationRepository.getBillingEntryDetails).toHaveBeenCalledWith('bill123');
      expect(notificationRepository.getFarmerColdStorageId).toHaveBeenCalledWith('farmer123');
      expect(notificationRepository.upsertBillingNotification).toHaveBeenCalledWith(
        'bill-bill123',
        'CS_REAL',
        'farmer123',
        'Storage rent of ₹2,500 is due for May 2026.'
      );
      expect(result).toEqual({ message: 'Bill notification marked as read' });
    });

    test('bill- prefix: falls back to DEFAULT_COLD_STORAGE_ID and default label if metadata missing', async () => {
      notificationRepository.getBillingEntryDetails.mockResolvedValueOnce({
        farmerId: 'farmer123',
        amount: 1000,
        periodLabel: null
      });
      notificationRepository.getFarmerColdStorageId.mockResolvedValueOnce(null);

      await notificationService.markNotificationRead('bill-bill123');

      expect(notificationRepository.upsertBillingNotification).toHaveBeenCalledWith(
        'bill-bill123',
        DEFAULT_COLD_STORAGE_ID,
        'farmer123',
        'Storage rent of ₹1,000 is due for recent storage period.'
      );
    });

    test('bill- prefix: skips upsert if bill is not found in database', async () => {
      notificationRepository.getBillingEntryDetails.mockResolvedValueOnce(null);

      const result = await notificationService.markNotificationRead('bill-bill123');

      expect(notificationRepository.upsertBillingNotification).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Bill notification marked as read' });
    });

    test('standard notification: throws 404 if notification userId does not exist', async () => {
      notificationRepository.getNotificationUserId.mockResolvedValueOnce(null);

      await expect(notificationService.markNotificationRead('notif_missing')).rejects.toMatchObject({
        statusCode: 404
      });
    });

    test('cold storage notification deletion: deletes notification if userId belongs to cold storage onboarding', async () => {
      notificationRepository.getNotificationUserId.mockResolvedValueOnce('CS_USER');
      notificationRepository.checkColdStorageExists.mockResolvedValueOnce(true);

      const result = await notificationService.markNotificationRead('notif123');

      expect(notificationRepository.deleteNotification).toHaveBeenCalledWith('notif123');
      expect(notificationRepository.markNotificationAsRead).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Notification deleted' });
    });

    test('farmer notification read flag: updates flag if userId is farmer', async () => {
      notificationRepository.getNotificationUserId.mockResolvedValueOnce('farmer123');
      notificationRepository.checkColdStorageExists.mockResolvedValueOnce(false);
      notificationRepository.markNotificationAsRead.mockResolvedValueOnce({ id: 'notif123', isRead: true });

      const result = await notificationService.markNotificationRead('notif123');

      expect(notificationRepository.markNotificationAsRead).toHaveBeenCalledWith('notif123');
      expect(result).toEqual({ notification: { id: 'notif123', isRead: true } });
    });

    test('farmer notification read flag: throws 404 if notification not found on mark as read', async () => {
      notificationRepository.getNotificationUserId.mockResolvedValueOnce('farmer123');
      notificationRepository.checkColdStorageExists.mockResolvedValueOnce(false);
      notificationRepository.markNotificationAsRead.mockResolvedValueOnce(null);

      await expect(notificationService.markNotificationRead('notif123')).rejects.toMatchObject({
        statusCode: 404
      });
    });
  });

  describe('registerUserPushToken', () => {
    test('resolves farmer id, strips prefix, and upserts token', async () => {
      notificationRepository.resolveFarmerId.mockResolvedValueOnce('resolved_farmer');

      await notificationService.registerUserPushToken(' +919876543210 ', 'token_abc');

      expect(notificationRepository.resolveFarmerId).toHaveBeenCalledWith('9876543210');
      expect(notificationRepository.upsertUserPushToken).toHaveBeenCalledWith(
        'resolved_farmer',
        'farmer_resolved_farmer@annsetu.local',
        'token_abc'
      );
    });
  });
});
