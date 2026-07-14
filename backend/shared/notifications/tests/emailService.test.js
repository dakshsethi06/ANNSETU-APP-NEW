const nodemailer = require('nodemailer');
const { sendEmail } = require('../emailService');

jest.mock('nodemailer');

describe('emailService unit tests', () => {
  let mockSendMail;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail = jest.fn();
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail
    });
    
    // Clear SMTP env variables by default
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  test('falls back to mock console log when SMTP parameters are unconfigured', async () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendEmail({
      to: 'farmer@test.com',
      subject: 'Mandi Rates update',
      text: 'Potato rates are up!'
    });

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.provider).toBe('console');
    expect(result.providerMessageId).toContain('mock-email-');
    expect(result.message).toBe('Potato rates are up!');
    expect(spyLog).toHaveBeenCalled();
    spyLog.mockRestore();
  });

  test('uses HTML body fallback if text body is empty in console fallback', async () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendEmail({
      to: 'farmer@test.com',
      subject: 'HTML update',
      html: '<h1>HTML Body</h1>'
    });

    expect(result.message).toBe('<h1>HTML Body</h1>');
    spyLog.mockRestore();
  });

  test('uses empty string fallback if both text and html are missing in console fallback', async () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendEmail({
      to: 'farmer@test.com',
      subject: 'Empty'
    });

    expect(result.message).toBe('');
    spyLog.mockRestore();
  });

  test('sends email via SMTP when host, user, and password are configured', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'smtp_user';
    process.env.SMTP_PASS = 'smtp_pass';
    process.env.SMTP_FROM = 'noreply@annsetu.com';

    mockSendMail.mockResolvedValueOnce({ messageId: 'msg_smtp_123' });

    const result = await sendEmail({
      to: 'farmer@test.com',
      subject: 'SMTP test',
      text: 'Body text',
      html: '<b>Body html</b>'
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 465,
      secure: true, // true since port is 465
      auth: { user: 'smtp_user', pass: 'smtp_pass' }
    });
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'noreply@annsetu.com',
      to: 'farmer@test.com',
      subject: 'SMTP test',
      text: 'Body text',
      html: '<b>Body html</b>'
    });
    expect(result).toEqual({
      success: true,
      provider: 'smtp',
      providerMessageId: 'msg_smtp_123',
      message: 'Body text'
    });
  });

  test('uses SMTP_FROM default fallback when not configured', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'smtp_user';
    process.env.SMTP_PASS = 'smtp_pass';

    mockSendMail.mockResolvedValueOnce({ messageId: 'msg_smtp_123' });

    await sendEmail({ to: 'farmer@test.com', subject: 'Default SMTP' });

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'no-reply@annsetu.local'
    }));
  });

  test('catches and throws transport sending errors', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'smtp_user';
    process.env.SMTP_PASS = 'smtp_pass';

    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendEmail({ to: 'farmer@test.com', subject: 'Fail' }))
      .rejects.toThrow('SMTP connection failed');

    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });
});
