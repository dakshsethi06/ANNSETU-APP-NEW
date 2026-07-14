const appNotificationRepository = require('../../../modules/notification/notification.repository');
const emailService = require('../emailService');
const smsService = require('../smsService');
const pushNotifications = require('../pushNotifications');
const db = require('../../../config/database');
const notifications = require('../notifications');

jest.mock('../../../modules/notification/notification.repository');
jest.mock('../emailService');
jest.mock('../smsService');
jest.mock('../pushNotifications');
jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('notifications core unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    delete process.env.SMS_API_URL;
  });

  describe('logOutboundNotification', () => {
    test('redacts 6-digit OTP codes and logs outbound notifications successfully', async () => {
      appNotificationRepository.insertNotificationLog.mockResolvedValueOnce({ success: true });

      const result = await notifications.logOutboundNotification({
        channel: 'SMS',
        eventType: 'VERIFICATION',
        message: 'Your verification OTP code is 123456. Do not share.',
        recipientPhone: '9876543210',
        metadata: { requestIp: '127.0.0.1' }
      });

      expect(appNotificationRepository.insertNotificationLog).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('log-'),
          null, // coldStorageId
          'SMS',
          'VERIFICATION',
          '9876543210',
          null, // recipientEmail
          null, // recipientName
          null, // subject
          'Your verification OTP code is ******. Do not share.', // Redacted message!
          'SENT',
          'console',
          null, // providerMessageId
          null,
          null,
          null,
          JSON.stringify({ requestIp: '127.0.0.1' })
        ])
      );
      expect(result).toEqual({ success: true });
    });

    test('logs null metadata without stringify and catches error when repository throws', async () => {
      appNotificationRepository.insertNotificationLog.mockRejectedValueOnce(new Error('Log table missing'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await notifications.logOutboundNotification({
        channel: 'SMS',
        eventType: 'VERIFICATION',
        message: 'Normal message'
      });

      expect(result).toBeNull();
      expect(spyError).toHaveBeenCalled();
      spyError.mockRestore();
    });
  });

  describe('sendEmail (with logging)', () => {
    test('calls emailService sendEmail and writes a SENT log entry to DB', async () => {
      emailService.sendEmail.mockResolvedValueOnce({
        provider: 'smtp',
        providerMessageId: 'smtp_123',
        message: 'Hello mail text'
      });
      appNotificationRepository.insertNotificationLog.mockResolvedValueOnce({ id: 'log_id' });

      const result = await notifications.sendEmail({
        to: 'test@mail.com',
        subject: 'Mail Subject',
        text: 'Hello mail text'
      });

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'test@mail.com',
        subject: 'Mail Subject',
        text: 'Hello mail text',
        html: null
      });
      expect(appNotificationRepository.insertNotificationLog).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(String),
          null,
          'EMAIL',
          'SYSTEM_ALERT',
          null,
          'test@mail.com',
          null,
          'Mail Subject',
          'Hello mail text',
          'SENT',
          'smtp',
          'smtp_123'
        ])
      );
      expect(result.provider).toBe('smtp');
    });

    test('writes a FAILED log entry to DB and rethrows when sendEmail fails', async () => {
      emailService.sendEmail.mockRejectedValueOnce(new Error('SMTP Auth error'));
      process.env.SMTP_HOST = 'smtp.host.com';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';

      await expect(notifications.sendEmail({
        to: 'test@mail.com',
        subject: 'Mail Subject',
        text: 'Hello mail text'
      })).rejects.toThrow('SMTP Auth error');

      expect(appNotificationRepository.insertNotificationLog).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(String),
          null,
          'EMAIL',
          'SYSTEM_ALERT',
          null,
          'test@mail.com',
          null,
          'Mail Subject',
          'Hello mail text',
          'FAILED',
          'smtp',
          null,
          null,
          null,
          'SMTP Auth error'
        ])
      );
    });

    test('logs console provider failure status if SMTP variables are not fully configured', async () => {
      emailService.sendEmail.mockRejectedValueOnce(new Error('Console write error'));

      await expect(notifications.sendEmail({
        to: 'test@mail.com',
        subject: 'Mail Subject',
        text: 'Hello mail'
      })).rejects.toThrow('Console write error');

      expect(appNotificationRepository.insertNotificationLog).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(String),
          null,
          'EMAIL',
          'SYSTEM_ALERT',
          null,
          'test@mail.com',
          null,
          'Mail Subject',
          'Hello mail',
          'FAILED',
          'console',
          null
        ])
      );
    });
  });

  describe('sendSMS (with logging)', () => {
    test('calls smsService sendSMS and writes a SENT log entry to DB', async () => {
      smsService.sendSMS.mockResolvedValueOnce({
        provider: 'twilio',
        providerMessageId: 'twilio_msg_123'
      });
      appNotificationRepository.insertNotificationLog.mockResolvedValueOnce({ id: 'log_id' });

      const result = await notifications.sendSMS({
        to: '9876543210',
        message: 'Hello SMS'
      });

      expect(smsService.sendSMS).toHaveBeenCalledWith({
        to: '9876543210',
        message: 'Hello SMS'
      });
      expect(appNotificationRepository.insertNotificationLog).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(String),
          null,
          'SMS',
          'SYSTEM_ALERT',
          '9876543210',
          null,
          null,
          null,
          'Hello SMS',
          'SENT',
          'twilio',
          'twilio_msg_123'
        ])
      );
      expect(result.provider).toBe('twilio');
    });

    test('writes a FAILED log entry to DB and rethrows when sendSMS fails', async () => {
      smsService.sendSMS.mockRejectedValueOnce(new Error('Twilio limit hit'));
      process.env.SMS_API_URL = 'http://smsapi.com';

      await expect(notifications.sendSMS({
        to: '9876543210',
        message: 'Hello SMS'
      })).rejects.toThrow('Twilio limit hit');

      expect(appNotificationRepository.insertNotificationLog).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(String),
          null,
          'SMS',
          'SYSTEM_ALERT',
          '9876543210',
          null,
          null,
          null,
          'Hello SMS',
          'FAILED',
          'sms-api',
          null,
          null,
          null,
          'Twilio limit hit'
        ])
      );
    });
  });

  describe('createAppNotification & ensureUserForFarmer', () => {
    test('creates DB record, checks/creates shadow farmer profile, triggers background push and sms/email triggers', async () => {
      // Setup mock repository responses
      appNotificationRepository.getUserForFarmer.mockResolvedValueOnce(false); // User does not exist
      appNotificationRepository.getFarmerDetails.mockResolvedValueOnce({
        name: 'Ram',
        coldStorageId: 'cs_xyz',
        mpin: '5566',
        email: 'ram@farmer.com'
      });
      appNotificationRepository.insertShadowUser.mockResolvedValueOnce({ success: true });
      appNotificationRepository.insertAppNotification.mockResolvedValueOnce({ id: 'notif_abc' });

      // Mock database name lookup queries inside createAppNotification background hook
      db.query.mockResolvedValueOnce({
        rows: [{ name: 'Ram', phone: '9876543210' }] // Farmer query
      }).mockResolvedValueOnce({
        rows: [{ email: 'ram@farmer.com' }] // User query
      });

      // Mock services
      smsService.sendSMS.mockResolvedValueOnce({ provider: 'console', providerMessageId: 'm1' });
      emailService.sendEmail.mockResolvedValueOnce({ provider: 'console', providerMessageId: 'm2' });

      const result = await notifications.createAppNotification({
        userId: 'farmer_123',
        lotId: 'lot_55',
        title: 'Lot Deposited',
        message: 'Your lot has been verified.',
        type: 'success',
        icon: 'check'
      });

      // 1. Ensure shadow user creation ran
      expect(appNotificationRepository.getUserForFarmer).toHaveBeenCalledWith('farmer_123');
      expect(appNotificationRepository.insertShadowUser).toHaveBeenCalledWith([
        'farmer_123', 'Ram', 'ram@farmer.com', '5566', 'OPERATOR', true, expect.any(Date), expect.any(Date), 'cs_xyz', 1
      ]);

      // 2. Ensure AppNotification db record inserted
      expect(appNotificationRepository.insertAppNotification).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('notif-'),
          'cmmp9txv0000ai3t4wush9trs', // default coldStorageId fallback
          'farmer_123',
          'lot_55',
          'success',
          'Lot Deposited',
          'Your lot has been verified.',
          'check',
          null,
          false
        ])
      );

      // 3. Ensure background push notification called
      expect(pushNotifications.sendPushNotification).toHaveBeenCalledWith(
        'farmer_123',
        'Lot Deposited',
        'Your lot has been verified.',
        { actionUrl: null }
      );

      // 4. Ensure background SMS & Email alert hooks triggered with logs
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "Farmer" WHERE id = $1'), ['farmer_123']);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "User" WHERE id = $1'), ['farmer_123']);

      expect(smsService.sendSMS).toHaveBeenCalledWith({
        to: '+919876543210',
        message: '[Lot Deposited] Your lot has been verified.'
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'ram@farmer.com',
        subject: 'AnnSetu Alert: Lot Deposited',
        text: expect.stringContaining('Dear Ram,\n\nYour lot has been verified.'),
        html: null
      });

      expect(result).toEqual({ id: 'notif_abc' });
    });

    test('runs shadow user creation fallbacks when farmer details are missing', async () => {
      appNotificationRepository.getUserForFarmer.mockResolvedValueOnce(false);
      appNotificationRepository.getFarmerDetails.mockResolvedValueOnce(null); // Farmer not found in DB
      appNotificationRepository.insertAppNotification.mockResolvedValueOnce({ id: 'notif_abc' });
      db.query.mockResolvedValueOnce({ rows: [] }) // Farmer query
              .mockResolvedValueOnce({ rows: [] }) // User query
              .mockResolvedValueOnce({
                rows: [{ name: 'ColdStorage Operator', phone: '9988776655', email: 'operator@cs.com' }] // CS query
              });

      smsService.sendSMS.mockResolvedValueOnce({ provider: 'console', providerMessageId: 'm1' });
      emailService.sendEmail.mockResolvedValueOnce({ provider: 'console', providerMessageId: 'm2' });

      await notifications.createAppNotification({
        userId: 'operator_123',
        title: 'New Dispatch Request',
        message: 'Approve now'
      });

      expect(appNotificationRepository.insertShadowUser).toHaveBeenCalledWith([
        'operator_123', 'Farmer', 'farmer_operator_123@annsetu.local', '1234', 'OPERATOR', true, expect.any(Date), expect.any(Date), 'cmmp9txv0000ai3t4wush9trs', 1
      ]);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "ColdStorageOnboarding"'), ['operator_123']);
    });

    test('suppresses ensureUserForFarmer exceptions safely without failing notification delivery', async () => {
      appNotificationRepository.getUserForFarmer.mockRejectedValueOnce(new Error('DB Timeout'));
      appNotificationRepository.insertAppNotification.mockResolvedValueOnce({ id: 'notif_abc' });
      db.query.mockResolvedValueOnce({ rows: [] })
              .mockResolvedValueOnce({ rows: [] })
              .mockResolvedValueOnce({ rows: [] });
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notifications.createAppNotification({
        userId: 'farmer_123',
        title: 'Offline msg',
        message: 'Body'
      });

      expect(spyError).toHaveBeenCalledWith('Error in ensureUserForFarmer for farmer_123:', 'DB Timeout');
      spyError.mockRestore();
    });

    test('suppresses push and auto hook delivery failure console warning logs safely', async () => {
      appNotificationRepository.getUserForFarmer.mockResolvedValueOnce(true);
      appNotificationRepository.insertAppNotification.mockResolvedValueOnce({ id: 'notif_abc' });
      db.query.mockRejectedValueOnce(new Error('Lookup query failed')); // crash name queries hook
      const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await notifications.createAppNotification({
        userId: 'farmer_123',
        title: 'Offline msg',
        message: 'Body'
      });

      expect(spyWarn).toHaveBeenCalledWith('[Auto Notification Hook] Error in background dispatch:', 'Lookup query failed');
      spyWarn.mockRestore();
    });

    test('returns null and suppresses console log when insertAppNotification encounters unique constraint violation error 23505', async () => {
      appNotificationRepository.getUserForFarmer.mockResolvedValueOnce(true);
      appNotificationRepository.insertAppNotification.mockRejectedValueOnce({ code: '23505', message: 'Unique key violation' });
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await notifications.createAppNotification({
        userId: 'farmer_123',
        title: 'Dup check',
        message: 'Body'
      });

      expect(result).toBeNull();
      expect(spyError).not.toHaveBeenCalled();
      spyError.mockRestore();
    });

    test('returns null and prints console error when insertAppNotification encounters general SQL crash', async () => {
      appNotificationRepository.getUserForFarmer.mockResolvedValueOnce(true);
      appNotificationRepository.insertAppNotification.mockRejectedValueOnce(new Error('Disk full'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await notifications.createAppNotification({
        userId: 'farmer_123',
        title: 'Fail check',
        message: 'Body'
      });

      expect(result).toBeNull();
      expect(spyError).toHaveBeenCalled();
      spyError.mockRestore();
    });

    test('handles background push dispatch errors and catches background hook auto SMS/Email sending failures gracefully', async () => {
      appNotificationRepository.getUserForFarmer.mockResolvedValueOnce(true);
      appNotificationRepository.insertAppNotification.mockResolvedValueOnce({ id: 'notif_abc' });
      db.query.mockResolvedValueOnce({
        rows: [{ name: 'Ram', phone: '9876543210' }]
      }).mockResolvedValueOnce({
        rows: [{ email: 'ram@farmer.com' }]
      });

      // Mock push notifications to throw to hit line 146
      pushNotifications.sendPushNotification.mockImplementationOnce(() => {
        throw new Error('Push failed');
      });

      // Mock sendSMS and sendEmail to reject to hit lines 183 and 196
      smsService.sendSMS.mockRejectedValueOnce(new Error('SMS Gateway Down'));
      emailService.sendEmail.mockRejectedValueOnce(new Error('Email server offline'));

      const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await notifications.createAppNotification({
        userId: 'farmer_123',
        title: 'Crash checks',
        message: 'Body'
      });

      // Assert push fail warning log (line 146)
      expect(spyWarn).toHaveBeenCalledWith('Failed to dispatch background push:', 'Push failed');

      // Assert SMS hook fail warning log (line 183)
      expect(spyWarn).toHaveBeenCalledWith('[Auto Notification Hook] Failed to send SMS:', 'SMS Gateway Down');

      // Assert Email hook fail warning log (line 196)
      expect(spyWarn).toHaveBeenCalledWith('[Auto Notification Hook] Failed to send Email:', 'Email server offline');

      spyWarn.mockRestore();
    });
  });
});
