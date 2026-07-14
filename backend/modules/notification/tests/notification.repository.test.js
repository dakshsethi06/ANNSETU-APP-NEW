const db = require('../../../config/database');
const notificationRepository = require('../notification.repository');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('notification.repository unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAppNotifications', async () => {
    const rows = [{ id: 'notif1', title: 'Title1' }];
    db.query.mockResolvedValueOnce({ rows });

    const result = await notificationRepository.getAppNotifications('farmer123');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "AppNotification" WHERE "userId" = $1'), ['farmer123']);
    expect(result).toEqual(rows);
  });

  test('getPendingBills', async () => {
    const rows = [{ id: 'bill1', status: 'PENDING' }];
    db.query.mockResolvedValueOnce({ rows });

    const result = await notificationRepository.getPendingBills('farmer123');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "BillingEntry" WHERE "farmerId" = $1 AND status = \'PENDING\''), ['farmer123']);
    expect(result).toEqual(rows);
  });

  test('markNotificationAsRead', async () => {
    const row = { id: 'notif1', isRead: true };
    db.query.mockResolvedValueOnce({ rows: [row] });

    const result = await notificationRepository.markNotificationAsRead('notif1');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "AppNotification" SET "isRead" = true'), ['notif1']);
    expect(result).toEqual(row);
  });

  test('insertNotificationLog', async () => {
    const row = { id: 'log1' };
    db.query.mockResolvedValueOnce({ rows: [row] });

    const params = ['log1', 'cs1', 'SMS', 'ALERT', '987', null, 'Ram', null, 'msg', 'SENT', 'console', null, null, null, null, null, null, null, null];
    const result = await notificationRepository.insertNotificationLog(params);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO "NotificationLog"'), params);
    expect(result).toEqual(row);
  });

  test('insertAppNotification', async () => {
    const row = { id: 'notif1' };
    db.query.mockResolvedValueOnce({ rows: [row] });

    const params = ['notif1', 'cs1', 'user1', null, 'info', 'T', 'M', 'icon', '/url', false, null, null, null];
    const result = await notificationRepository.insertAppNotification(params);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO "AppNotification"'), params);
    expect(result).toEqual(row);
  });

  describe('resolveFarmerId', () => {
    test('returns matching farmer ID if found by phone or ID', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'farmer_resolved_123' }] });

      const result = await notificationRepository.resolveFarmerId('9876543210');

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id FROM "Farmer" WHERE phone = $1 OR id = $1'), ['9876543210']);
      expect(result).toBe('farmer_resolved_123');
    });

    test('returns original argument if no farmer found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationRepository.resolveFarmerId('ghost_user');

      expect(result).toBe('ghost_user');
    });
  });

  describe('checkColdStorageExists', () => {
    test('returns true if cold storage exists', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'cs123' }] });

      const result = await notificationRepository.checkColdStorageExists('cs123');

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id FROM "ColdStorageOnboarding"'), ['cs123']);
      expect(result).toBe(true);
    });

    test('returns false if cold storage does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationRepository.checkColdStorageExists('ghost_cs');

      expect(result).toBe(false);
    });
  });

  describe('getProcessedTransactionsSql', () => {
    test('uses CS-specific Nikasi transaction SQL if isCS is true', async () => {
      const rows = [{ packetsDispatched: 100, status: 'DISPATCHED' }];
      db.query.mockResolvedValueOnce({ rows });

      const result = await notificationRepository.getProcessedTransactionsSql('cs123', true);

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('"coldStorageId" = $1 AND "status" = \'DISPATCHED\''), ['cs123']);
      expect(result).toEqual(rows);
    });

    test('uses Farmer-specific Nikasi transaction SQL if isCS is false', async () => {
      const rows = [{ packetsDispatched: 50, status: 'DELIVERED' }];
      db.query.mockResolvedValueOnce({ rows });

      const result = await notificationRepository.getProcessedTransactionsSql('farmer123', false);

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('"farmerId" = $1 AND "status" != \'CREATED\''), ['farmer123']);
      expect(result).toEqual(rows);
    });
  });

  describe('checkPaymentExists', () => {
    test('returns true if payment exists', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'pay123' }] });

      const result = await notificationRepository.checkPaymentExists('pay123');

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id FROM "Payment"'), ['pay123']);
      expect(result).toBe(true);
    });

    test('returns false if payment does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationRepository.checkPaymentExists('pay_ghost');

      expect(result).toBe(false);
    });
  });

  test('getUnreadNotifications', async () => {
    const rows = [{ id: 'notif1', isRead: false }];
    db.query.mockResolvedValueOnce({ rows });

    const result = await notificationRepository.getUnreadNotifications();

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM "AppNotification" WHERE "isRead" = false'));
    expect(result).toEqual(rows);
  });

  test('deleteNotification', async () => {
    db.query.mockResolvedValueOnce();

    await notificationRepository.deleteNotification('notif1');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM "AppNotification" WHERE id = $1'), ['notif1']);
  });

  test('getBillingEntryDetails', async () => {
    const row = { farmerId: 'farmer1', amount: 1000, periodLabel: 'June' };
    db.query.mockResolvedValueOnce({ rows: [row] });

    const result = await notificationRepository.getBillingEntryDetails('bill1');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT "farmerId", amount, "periodLabel" FROM "BillingEntry" WHERE id = $1'), ['bill1']);
    expect(result).toEqual(row);
  });

  describe('getFarmerColdStorageId', () => {
    test('returns coldStorageId if farmer has basic details', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ coldStorageId: 'CS_REAL' }] });

      const result = await notificationRepository.getFarmerColdStorageId('farmer1');

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT "coldStorageId" FROM "Farmer" WHERE id = $1'), ['farmer1']);
      expect(result).toBe('CS_REAL');
    });

    test('returns undefined if farmer does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationRepository.getFarmerColdStorageId('farmer_ghost');

      expect(result).toBeUndefined();
    });
  });

  test('upsertBillingNotification', async () => {
    db.query.mockResolvedValueOnce();

    await notificationRepository.upsertBillingNotification('bill1', 'cs1', 'farmer1', 'test message');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "AppNotification"'),
      ['bill1', 'cs1', 'farmer1', 'test message']
    );
  });

  describe('getNotificationUserId', () => {
    test('returns userId if notification exists', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ userId: 'user123' }] });

      const result = await notificationRepository.getNotificationUserId('notif1');

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT "userId" FROM "AppNotification" WHERE id = $1'), ['notif1']);
      expect(result).toBe('user123');
    });

    test('returns undefined if notification does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationRepository.getNotificationUserId('notif_ghost');

      expect(result).toBeUndefined();
    });
  });

  test('exports userSync methods correctly', () => {
    expect(notificationRepository.getUserForFarmer).toBeDefined();
    expect(notificationRepository.getFarmerDetails).toBeDefined();
    expect(notificationRepository.insertShadowUser).toBeDefined();
    expect(notificationRepository.upsertUserPushToken).toBeDefined();
  });
});
