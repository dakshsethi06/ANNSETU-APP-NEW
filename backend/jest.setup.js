// Fake env vars so tests never need the real .env
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb';
process.env.RAZORPAY_KEY_ID = 'test_key';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASS = 'test_pass';

// Fake PostgreSQL — tests never touch the real database
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Fake Razorpay — no real payment API calls
jest.mock('razorpay', () =>
  jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn().mockResolvedValue({ id: 'order_test123', amount: 50000 }) },
  }))
);

// Fake nodemailer — no real emails sent
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
}));