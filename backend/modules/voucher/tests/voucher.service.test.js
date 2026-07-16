const voucherService = require('../voucher.service');
const voucherRepository = require('../voucher.repository');

jest.mock('../voucher.repository', () => ({
  getVoucherByCode: jest.fn(),
  getVoucherByCodeForUpdate: jest.fn(),
  incrementVoucherUsage: jest.fn(),
  insertVoucherLedger: jest.fn()
}));

describe('Voucher Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndCalculateDiscount', () => {
    test('calculates correct flat discount', async () => {
      const mockVoucher = {
        code: 'FLAT50',
        type: 'FLAT',
        value: '50.00',
        minOrderAmount: '100.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 5,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCode.mockResolvedValueOnce(mockVoucher);

      const result = await voucherService.validateAndCalculateDiscount('FLAT50', 'F1', 150);
      expect(result.discountAmount).toBe(50);
      expect(result.netAmount).toBe(100);
      expect(result.voucher).toEqual(mockVoucher);
    });

    test('caps flat discount to order amount if amount is less than discount value', async () => {
      const mockVoucher = {
        code: 'FLAT200',
        type: 'FLAT',
        value: '200.00',
        minOrderAmount: '0.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 1,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCode.mockResolvedValueOnce(mockVoucher);

      const result = await voucherService.validateAndCalculateDiscount('FLAT200', 'F1', 120);
      expect(result.discountAmount).toBe(120);
      expect(result.netAmount).toBe(0);
    });

    test('calculates percentage discount correctly', async () => {
      const mockVoucher = {
        code: 'PERCENT10',
        type: 'PERCENTAGE',
        value: '10.00',
        minOrderAmount: '0.00',
        maxDiscountAmount: '50.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 5,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCode.mockResolvedValueOnce(mockVoucher);

      let result = await voucherService.validateAndCalculateDiscount('PERCENT10', 'F1', 300);
      expect(result.discountAmount).toBe(30);
      expect(result.netAmount).toBe(270);

      // Verify max cap
      voucherRepository.getVoucherByCode.mockResolvedValueOnce(mockVoucher);
      result = await voucherService.validateAndCalculateDiscount('PERCENT10', 'F1', 600);
      expect(result.discountAmount).toBe(50);
      expect(result.netAmount).toBe(550);
    });

    test('caps percentage discount to total order amount', async () => {
      const mockVoucher = {
        code: 'PERCENT200', // 200% off (unrealistic but tests cap)
        type: 'PERCENTAGE',
        value: '200.00',
        minOrderAmount: '0.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 5,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCode.mockResolvedValueOnce(mockVoucher);

      const result = await voucherService.validateAndCalculateDiscount('PERCENT200', 'F1', 100);
      expect(result.discountAmount).toBe(100);
      expect(result.netAmount).toBe(0);
    });

    test('calculates credit note discount correctly', async () => {
      const mockVoucher = {
        code: 'CREDIT100',
        type: 'CREDIT_NOTE',
        value: '100.00',
        minOrderAmount: '0.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 1,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCode.mockResolvedValueOnce(mockVoucher);

      const result = await voucherService.validateAndCalculateDiscount('CREDIT100', 'F1', 150);
      expect(result.discountAmount).toBe(100);
      expect(result.netAmount).toBe(50);
    });

    test('throws error if voucher not found', async () => {
      voucherRepository.getVoucherByCode.mockResolvedValueOnce(null);
      await expect(
        voucherService.validateAndCalculateDiscount('INVALID', 'F1', 100)
      ).rejects.toThrow('Voucher code not found.');
    });

    test('throws error if status is not ACTIVE', async () => {
      voucherRepository.getVoucherByCode.mockResolvedValueOnce({ status: 'EXHAUSTED' });
      await expect(
        voucherService.validateAndCalculateDiscount('SAVE50', 'F1', 100)
      ).rejects.toThrow('Voucher is not active.');
    });

    test('throws error if expired', async () => {
      voucherRepository.getVoucherByCode.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() - 1000) // 1 second ago
      });
      await expect(
        voucherService.validateAndCalculateDiscount('SAVE50', 'F1', 100)
      ).rejects.toThrow('Voucher has expired.');
    });

    test('throws error if usage count reaches usage limit', async () => {
      voucherRepository.getVoucherByCode.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() + 86400000),
        usageCount: 2,
        usageLimit: 2
      });
      await expect(
        voucherService.validateAndCalculateDiscount('SAVE50', 'F1', 100)
      ).rejects.toThrow('Voucher usage limit has been reached.');
    });

    test('throws error if order amount is less than minOrderAmount', async () => {
      voucherRepository.getVoucherByCode.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() + 86400000),
        minOrderAmount: '200.00'
      });
      await expect(
        voucherService.validateAndCalculateDiscount('SAVE50', 'F1', 100)
      ).rejects.toThrow('Order amount is below the minimum required amount');
    });

    test('throws error if coldStorageId mismatch', async () => {
      voucherRepository.getVoucherByCode.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() + 86400000),
        coldStorageId: 'CS1'
      });
      await expect(
        voucherService.validateAndCalculateDiscount('SAVE50', 'F1', 100, 'CS2')
      ).rejects.toThrow('Voucher is not valid for this cold storage.');
    });

    test('throws error if farmerId mismatch', async () => {
      voucherRepository.getVoucherByCode.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() + 86400000),
        farmerId: 'F1'
      });
      await expect(
        voucherService.validateAndCalculateDiscount('SAVE50', 'F2', 100)
      ).rejects.toThrow('Voucher is not valid for this account.');
    });

    test('throws error if voucher type is invalid', async () => {
      voucherRepository.getVoucherByCode.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() + 86400000),
        type: 'INVALID_TYPE',
        value: '10'
      });
      await expect(
        voucherService.validateAndCalculateDiscount('SAVE50', 'F1', 100)
      ).rejects.toThrow('Invalid voucher type.');
    });

    test('uses default values of 0 if amount or value is missing', async () => {
      const mockVoucher = {
        code: 'FLATDEF',
        type: 'FLAT',
        minOrderAmount: '0.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 1,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCode.mockResolvedValueOnce(mockVoucher);

      const result = await voucherService.validateAndCalculateDiscount('FLATDEF', 'F1');
      expect(result.discountAmount).toBe(0);
      expect(result.netAmount).toBe(0);
    });
  });

  describe('redeemVoucherTransaction', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = { query: jest.fn() };
    });

    test('throws error if no client transaction provided', async () => {
      await expect(
        voucherService.redeemVoucherTransaction('SAVE50', 'F1', 100, 'O1')
      ).rejects.toThrow('Database client transaction is required');
    });

    test('successfully processes valid flat discount redemption', async () => {
      const mockVoucher = {
        code: 'SAVE50',
        type: 'FLAT',
        value: '50.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 1,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce(mockVoucher);

      const discount = await voucherService.redeemVoucherTransaction('SAVE50', 'F1', 100, 'O1', mockClient);

      expect(discount).toBe(50);
      expect(voucherRepository.getVoucherByCodeForUpdate).toHaveBeenCalledWith('SAVE50', mockClient);
      expect(voucherRepository.incrementVoucherUsage).toHaveBeenCalledWith('SAVE50', mockClient);
      expect(voucherRepository.insertVoucherLedger).toHaveBeenCalledWith({
        farmerId: 'F1',
        voucherCode: 'SAVE50',
        discountApplied: 50,
        orderId: 'O1'
      }, mockClient);
    });

    test('successfully processes valid percentage discount redemption', async () => {
      const mockVoucher = {
        code: 'SAVE10%',
        type: 'PERCENTAGE',
        value: '10.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 1,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce(mockVoucher);

      const discount = await voucherService.redeemVoucherTransaction('SAVE10%', 'F1', 150, 'O1', mockClient);

      expect(discount).toBe(15);
    });

    test('throws error during redemption if voucher not found', async () => {
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce(null);

      await expect(
        voucherService.redeemVoucherTransaction('SAVE50', 'F1', 100, 'O1', mockClient)
      ).rejects.toThrow('Voucher code not found.');
    });

    test('throws error during redemption if voucher is inactive', async () => {
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce({ status: 'EXPIRED' });

      await expect(
        voucherService.redeemVoucherTransaction('SAVE50', 'F1', 100, 'O1', mockClient)
      ).rejects.toThrow('Voucher is not active.');
    });

    test('throws error during redemption if expired', async () => {
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() - 1000)
      });

      await expect(
        voucherService.redeemVoucherTransaction('SAVE50', 'F1', 100, 'O1', mockClient)
      ).rejects.toThrow('Voucher has expired.');
    });

    test('throws error during redemption if usage count reaches usage limit', async () => {
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() + 86400000),
        usageCount: 1,
        usageLimit: 1
      });

      await expect(
        voucherService.redeemVoucherTransaction('SAVE50', 'F1', 100, 'O1', mockClient)
      ).rejects.toThrow('Voucher usage limit has been reached.');
    });

    test('successfully processes valid percentage discount redemption with max cap', async () => {
      const mockVoucher = {
        code: 'SAVE20%',
        type: 'PERCENTAGE',
        value: '20.00',
        maxDiscountAmount: '10.00',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 1,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce(mockVoucher);

      const discount = await voucherService.redeemVoucherTransaction('SAVE20%', 'F1', 150, 'O1', mockClient);

      expect(discount).toBe(10); // 20% of 150 is 30, but capped at 10
    });

    test('uses default value of 0 for amount and value in redemption if missing', async () => {
      const mockVoucher = {
        code: 'FLATDEF',
        type: 'FLAT',
        status: 'ACTIVE',
        usageCount: 0,
        usageLimit: 1,
        expiryDate: new Date(Date.now() + 86400000)
      };
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce(mockVoucher);

      const result = await voucherService.redeemVoucherTransaction('FLATDEF', 'F1', undefined, 'O1', mockClient);
      expect(result).toBe(0);
    });

    test('throws error during redemption if voucher type is invalid', async () => {
      voucherRepository.getVoucherByCodeForUpdate.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() + 86400000),
        type: 'INVALID'
      });

      await expect(
        voucherService.redeemVoucherTransaction('SAVE50', 'F1', 100, 'O1', mockClient)
      ).rejects.toThrow('Invalid voucher type.');
    });
  });
});
