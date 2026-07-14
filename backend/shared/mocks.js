// Standard mock objects for testing

const mockDb = {
  query: jest.fn()
};

const mockPaymentRepository = {
  getFarmerPendingRent: jest.fn(),
  createPendingPayment: jest.fn()
};

const mockRazorpayService = {
  isMockMode: jest.fn(),
  createOrder: jest.fn(),
  createPaymentLink: jest.fn(),
  keyId: 'rzp_test_mockkey'
};

module.exports = {
  mockDb,
  mockPaymentRepository,
  mockRazorpayService
};
