const axios = require('axios');
const { sendSMS } = require('../smsService');

jest.mock('axios');

describe('smsService unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    delete process.env.SMS_API_URL;
    delete process.env.SMS_API_KEY;
    delete process.env.SMS_SENDER_ID;
  });

  test('falls back to mock SMS logging when no provider is configured', async () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendSMS({ to: '9876543210', message: 'Hello farmer!' });

    expect(axios.post).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.provider).toBe('console');
    expect(result.providerMessageId).toContain('mock-sms-');
    expect(spyLog).toHaveBeenCalled();
    spyLog.mockRestore();
  });

  test('sends SMS via Twilio when Twilio credentials are provided', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'token_test';
    process.env.TWILIO_FROM_NUMBER = '+15005550006';

    axios.post.mockResolvedValueOnce({
      data: { sid: 'SM_twilio_sid_123' }
    });

    const result = await sendSMS({ to: '9876543210', message: 'Twilio msg' });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/AC_test/Messages.json',
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: {
          'Authorization': expect.stringContaining('Basic '),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
    expect(result).toEqual({
      success: true,
      provider: 'twilio',
      providerMessageId: 'SM_twilio_sid_123'
    });
  });

  test('catches Twilio errors and throws formatted twilio exception', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'token_test';
    process.env.TWILIO_FROM_NUMBER = '+15005550006';

    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid phone number' } }
    });
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendSMS({ to: '9876543210', message: 'Twilio msg' }))
      .rejects.toThrow('Twilio SMS sending failed: {"message":"Invalid phone number"}');

    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });

  test('catches Twilio network errors and throws fallback exception', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'token_test';
    process.env.TWILIO_FROM_NUMBER = '+15005550006';

    axios.post.mockRejectedValueOnce(new Error('Connection timed out'));
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendSMS({ to: '9876543210', message: 'Twilio msg' }))
      .rejects.toThrow('Twilio SMS sending failed: Connection timed out');

    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });

  test('sends SMS via Generic HTTP gateway when SMS_API_URL is configured (and Twilio is not)', async () => {
    process.env.SMS_API_URL = 'https://api.sms-gateway.com/send';
    process.env.SMS_API_KEY = 'gateway_key_123';
    process.env.SMS_SENDER_ID = 'SENDER';

    axios.post.mockResolvedValueOnce({
      data: { id: 'generic_msg_556' }
    });

    const result = await sendSMS({ to: '9876543210', message: 'Generic msg' });

    expect(axios.post).toHaveBeenCalledWith('https://api.sms-gateway.com/send', {
      apiKey: 'gateway_key_123',
      to: '9876543210',
      message: 'Generic msg',
      sender: 'SENDER'
    });
    expect(result).toEqual({
      success: true,
      provider: 'generic-http',
      providerMessageId: 'generic_msg_556'
    });
  });

  test('uses fallback providerMessageId in Generic Gateway if response data does not contain id', async () => {
    process.env.SMS_API_URL = 'https://api.sms-gateway.com/send';

    axios.post.mockResolvedValueOnce({ data: null });

    const result = await sendSMS({ to: '9876543210', message: 'Generic msg' });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toContain('generic-');
  });

  test('catches Generic Gateway error and throws exception', async () => {
    process.env.SMS_API_URL = 'https://api.sms-gateway.com/send';

    axios.post.mockRejectedValueOnce(new Error('Gateway rejected'));
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendSMS({ to: '9876543210', message: 'Generic msg' }))
      .rejects.toThrow('Gateway rejected');

    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });
});
