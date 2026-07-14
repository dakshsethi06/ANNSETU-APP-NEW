const mocks = require('../mocks');

describe('shared mocks export', () => {
  test('exports mock objects with expected structures', () => {
    expect(mocks.mockDb).toBeDefined();
    expect(typeof mocks.mockDb.query).toBe('function');

    expect(mocks.mockPaymentRepository).toBeDefined();
    expect(typeof mocks.mockPaymentRepository.getFarmerPendingRent).toBe('function');
    expect(typeof mocks.mockPaymentRepository.createPendingPayment).toBe('function');

    expect(mocks.mockRazorpayService).toBeDefined();
    expect(typeof mocks.mockRazorpayService.isMockMode).toBe('function');
    expect(typeof mocks.mockRazorpayService.createOrder).toBe('function');
    expect(typeof mocks.mockRazorpayService.createPaymentLink).toBe('function');
    expect(mocks.mockRazorpayService.keyId).toBe('rzp_test_mockkey');
  });
});
