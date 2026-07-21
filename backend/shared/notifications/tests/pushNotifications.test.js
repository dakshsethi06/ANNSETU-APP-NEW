const axios = require('axios');
const db = require('../../../config/database');
const { sendPushNotification } = require('../pushNotifications');

jest.mock('axios');
jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('pushNotifications unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns early if userId is falsy', async () => {
    await sendPushNotification('', 'Title', 'Body');
    expect(db.query).not.toHaveBeenCalled();
  });

  test('returns early if database query returns no matching user', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await sendPushNotification('user123', 'Title', 'Body');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT "pushToken" FROM "User"'), ['user123']);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns early if pushToken is empty/null', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ pushToken: null }] });

    await sendPushNotification('user123', 'Title', 'Body');

    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns early if pushToken does not start with ExponentPushToken', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ pushToken: 'invalid_token_123' }] });

    await sendPushNotification('user123', 'Title', 'Body');

    expect(axios.post).not.toHaveBeenCalled();
  });

  test('sends push notification successfully via Expo gateway when token is valid', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ pushToken: 'ExponentPushToken[abc123]' }] });
    axios.post.mockResolvedValueOnce({
      data: { data: { status: 'ok' } }
    });
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await sendPushNotification('user123', 'New Mandi Price', 'Potato rates at ₹1200', { route: 'Mandi' });

    expect(axios.post).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      {
        to: 'ExponentPushToken[abc123]',
        sound: 'default',
        title: 'New Mandi Price',
        body: 'Potato rates at ₹1200',
        data: { route: 'Mandi' }
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        })
      })
    );
    expect(spyLog).toHaveBeenNthCalledWith(2, '[Push Notification] Response status:', 'ok');
    spyLog.mockRestore();
  });

  test('does not log status if response structure is incomplete', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ pushToken: 'ExponentPushToken[abc123]' }] });
    axios.post.mockResolvedValueOnce({
      data: {} // Missing data.data
    });
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await sendPushNotification('user123', 'Title', 'Body');

    // Should only be called once with the Delivery message, but not the status message
    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).not.toHaveBeenCalledWith(expect.stringContaining('[Push Notification] Response status:'));
    spyLog.mockRestore();
  });

  test('catches request exception and console errors them', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ pushToken: 'ExponentPushToken[abc123]' }] });
    axios.post.mockRejectedValueOnce(new Error('Gateway Down'));
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await sendPushNotification('user123', 'Title', 'Body');

    expect(spyError).toHaveBeenCalledWith('[Push Notification] Error sending to user user123:', 'Gateway Down');
    spyError.mockRestore();
  });
});
