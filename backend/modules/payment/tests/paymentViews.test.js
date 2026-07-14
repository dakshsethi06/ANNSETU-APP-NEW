const db = require('../../../config/database');
const fs = require('fs');
const paymentRepository = require('../payment.repository');
const { renderMockCheckout, renderSuccessPage } = require('../payment.views.controller');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

jest.mock('../payment.repository', () => ({
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

  describe('renderMockCheckout', () => {
    test('should sanitize and escape orderId parameter', async () => {
      const maliciousOrderId = 'order_<script>alert("xss")</script>_&_"_\'';
      mockReq = { params: { orderId: maliciousOrderId } };
      paymentRepository.getPaymentById.mockResolvedValueOnce({ amount: 150.50 });

      await renderMockCheckout(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
      const htmlResponse = mockRes.send.mock.calls[0][0];
      expect(htmlResponse).not.toContain(maliciousOrderId);
      expect(htmlResponse).toContain('order_&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;_&amp;_&quot;_&#39;');
      expect(htmlResponse).toContain('₹150.50');
    });

    test('should default amount to 0 if payment is not found', async () => {
      mockReq = { params: { orderId: 'ord1' } };
      paymentRepository.getPaymentById.mockResolvedValueOnce(null);

      await renderMockCheckout(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
      const htmlResponse = mockRes.send.mock.calls[0][0];
      expect(htmlResponse).toContain('₹0.00');
    });

    test('should log warning and default to 0 if payment retrieval throws error', async () => {
      mockReq = { params: { orderId: 'ord1' } };
      paymentRepository.getPaymentById.mockRejectedValueOnce(new Error('Retrieval error'));
      const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await renderMockCheckout(mockReq, mockRes);

      expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve order amount'), 'Retrieval error');
      expect(mockRes.send).toHaveBeenCalled();
      spyWarn.mockRestore();
    });

    test('should return 500 status and log error if template reading fails', async () => {
      mockReq = { params: { orderId: 'ord1' } };
      paymentRepository.getPaymentById.mockResolvedValueOnce({ amount: 100 });
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('File read fail');
      });
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await renderMockCheckout(mockReq, mockRes);

      expect(res => res.status).not.toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error rendering page.');
      expect(spyError).toHaveBeenCalled();
      
      spyError.mockRestore();
      fs.readFileSync.mockRestore();
    });
  });

  describe('renderSuccessPage', () => {
    test('should sanitize and escape order_id and payment_id query parameters', async () => {
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
      expect(htmlResponse).not.toContain(maliciousOrderId);
      expect(htmlResponse).not.toContain(maliciousPaymentId);
      expect(htmlResponse).toContain('order_&lt;script&gt;alert(&quot;xss1&quot;)&lt;/script&gt;');
      expect(htmlResponse).toContain('pay_&lt;img src=x onerror=alert(1)&gt;');
    });

    test('should update status on success redirect successfully', async () => {
      mockReq = {
        query: {
          order_id: 'ord1',
          payment_id: 'pay1'
        }
      };

      await renderSuccessPage(mockReq, mockRes);

      expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('ord1', 'PAID', 'pay1');
    });

    test('should log error if status update fails', async () => {
      mockReq = {
        query: {
          order_id: 'ord1',
          payment_id: 'pay1'
        }
      };
      paymentRepository.updatePaymentStatus.mockRejectedValueOnce(new Error('Update failed'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await renderSuccessPage(mockReq, mockRes);

      expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Failed to update status on success redirect'), 'Update failed');
      spyError.mockRestore();
    });

    test('should fallback to empty string when escaping null or undefined', async () => {
      mockReq = { params: { orderId: null } };
      paymentRepository.getPaymentById.mockResolvedValueOnce(null);
      await renderMockCheckout(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalled();

      mockReq = { params: { orderId: undefined } };
      paymentRepository.getPaymentById.mockResolvedValueOnce(null);
      await renderMockCheckout(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalled();
    });

    test('should return 500 status and log error if CSS stylesheet reading fails on success page', async () => {
      mockReq = { query: {} };
      let callCount = 0;
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        callCount++;
        if (filePath.endsWith('success.css')) {
          throw new Error('CSS Fail');
        }
        return '<html>{{orderId}}</html>';
      });
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await renderSuccessPage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(spyError).toHaveBeenCalled();
      
      spyError.mockRestore();
      fs.readFileSync.mockRestore();
    });

    test('should return 500 status and log error if template reading fails', async () => {
      mockReq = { query: {} };
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('File read fail');
      });
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await renderSuccessPage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error rendering page.');
      expect(spyError).toHaveBeenCalled();

      spyError.mockRestore();
      fs.readFileSync.mockRestore();
    });
  });
});
