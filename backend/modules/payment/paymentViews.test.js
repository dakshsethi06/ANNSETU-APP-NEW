const db = require('../../config/database');
const paymentRepository = require('./payment.repository');
const { renderMockCheckout, renderSuccessPage } = require('./payment.views.controller');

jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

jest.mock('./payment.repository', () => ({
  updatePaymentStatus: jest.fn(),
  getPaymentById: jest.fn()
}));

describe('Payment Views Sanitization and Escaping Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
  });

  test('renderMockCheckout should sanitize and escape orderId parameter', async () => {
    // Malicious orderId payload
    const maliciousOrderId = 'order_<script>alert("xss")</script>_&_"_\'';
    mockReq = {
      params: { orderId: maliciousOrderId }
    };

    // Mock repository to return amount
    paymentRepository.getPaymentById.mockResolvedValue({ amount: 150.50 });

    await renderMockCheckout(mockReq, mockRes);

    expect(mockRes.send).toHaveBeenCalled();
    const htmlResponse = mockRes.send.mock.calls[0][0];

    // Assert that the malicious scripts/tags are escaped as HTML entities
    expect(htmlResponse).not.toContain(maliciousOrderId);
    expect(htmlResponse).toContain('order_&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;_&amp;_&quot;_&#39;');
    expect(htmlResponse).toContain('₹150.50');
  });

  test('renderSuccessPage should sanitize and escape order_id and payment_id query parameters', async () => {
    // Malicious inputs in query parameters
    const maliciousOrderId = 'order_<script>alert("xss1")</script>';
    const maliciousPaymentId = 'pay_<img src=x onerror=alert(1)>';
    
    mockReq = {
      query: {
        order_id: maliciousOrderId,
        payment_id: maliciousPaymentId
      }
    };

    await renderSuccessPage(mockReq, mockRes);

    expect(mockRes.send).toHaveBeenCalled();
    const htmlResponse = mockRes.send.mock.calls[0][0];

    // Assert that both variables are escaped and not output raw
    expect(htmlResponse).not.toContain(maliciousOrderId);
    expect(htmlResponse).not.toContain(maliciousPaymentId);
    expect(htmlResponse).toContain('order_&lt;script&gt;alert(&quot;xss1&quot;)&lt;/script&gt;');
    expect(htmlResponse).toContain('pay_&lt;img src=x onerror=alert(1)&gt;');
  });
});
