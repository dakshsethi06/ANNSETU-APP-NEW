const db = require('../../../config/database');
const razorpayService = require('../razorpay.service');
const paymentRepository = require('../payment.repository');

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

jest.mock('../razorpay.service', () => ({
  fetchPaymentDetails: jest.fn()
}));

const voucherService = require('../../voucher/voucher.service');
jest.mock('../../voucher/voucher.service', () => ({
  redeemVoucherTransaction: jest.fn()
}));

describe('payment.repository', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };
    db.connect.mockResolvedValue(mockClient);
  });

  describe('getFarmerPendingRent', () => {
    test('returns sum from rows', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ pendingRent: '1250.50' }] });
      const result = await paymentRepository.getFarmerPendingRent('farmer_1');
      expect(result).toBe(1250.50);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), ['farmer_1']);
    });

    test('returns 0 if no row or null pendingRent', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      let result = await paymentRepository.getFarmerPendingRent('farmer_1');
      expect(result).toBe(0);

      db.query.mockResolvedValueOnce({ rows: [{ pendingRent: null }] });
      result = await paymentRepository.getFarmerPendingRent('farmer_1');
      expect(result).toBe(0);
    });
  });

  describe('createPendingPayment', () => {
    test('throws if coldStorageId is missing', async () => {
      await expect(
        paymentRepository.createPendingPayment({ orderId: 'ord_1', farmerId: 'farmer_1', amount: 100 })
      ).rejects.toThrow('coldStorageId is required');
    });

    test('performs insert query with standard parameters', async () => {
      db.query.mockResolvedValueOnce({});
      await paymentRepository.createPendingPayment({
        orderId: 'ord_1',
        farmerId: 'farmer_1',
        amount: 100,
        note: 'My Note',
        createdByUserId: 'USER_1',
        coldStorageId: 'CS_1'
      });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [
        'ord_1',
        'farmer_1',
        100,
        'My Note',
        'USER_1',
        'CS_1',
        null,
        0
      ]);
    });

    test('performs insert query with default note and createdByUserId', async () => {
      db.query.mockResolvedValueOnce({});
      await paymentRepository.createPendingPayment({
        orderId: 'ord_1',
        farmerId: 'farmer_1',
        amount: 100,
        coldStorageId: 'CS_1'
      });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [
        'ord_1',
        'farmer_1',
        100,
        'Online payment via App',
        'FARMER_APP',
        'CS_1',
        null,
        0
      ]);
    });

    test('performs insert query with custom voucher fields', async () => {
      db.query.mockResolvedValueOnce({});
      await paymentRepository.createPendingPayment({
        orderId: 'ord_1',
        farmerId: 'farmer_1',
        amount: 80,
        coldStorageId: 'CS_1',
        voucherCode: 'SAVE20',
        discountAmount: 20
      });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [
        'ord_1',
        'farmer_1',
        80,
        'Online payment via App',
        'FARMER_APP',
        'CS_1',
        'SAVE20',
        20
      ]);
    });
  });

  describe('updatePaymentStatus', () => {
    test('returns early if payment record does not exist', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Payment query
      await paymentRepository.updatePaymentStatus('ord_1', 'PAID');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('updates status and reference, fetches Razorpay details if transitions to PAID with paymentId', async () => {
      const payment = { id: 'ord_1', farmerId: 'farmer_1', amount: '300.00', status: 'PENDING' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // UPDATE Payment
        .mockResolvedValueOnce({ rows: [] }); // SELECT NikasiTransaction
      
      razorpayService.fetchPaymentDetails.mockResolvedValueOnce({
        id: 'pay_1',
        method: 'netbanking',
        bank: 'HDFC',
        acquirer_data: { bank_transaction_id: 'HDFC123' }
      });

      await paymentRepository.updatePaymentStatus('ord_1', 'PAID', 'pay_1');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(razorpayService.fetchPaymentDetails).toHaveBeenCalledWith('pay_1');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "Payment"'), [
        'PAID',
        'pay_1',
        'HDFC Bank',
        'HDFC123',
        'NETBANKING',
        'ord_1'
      ]);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('handles Razorpay fetch details failing and logs warnings', async () => {
      const payment = { id: 'ord_1', farmerId: 'farmer_1', amount: '0.00', status: 'PENDING' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // UPDATE Payment

      razorpayService.fetchPaymentDetails.mockRejectedValueOnce(new Error('Razorpay failure'));
      const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await paymentRepository.updatePaymentStatus('ord_1', 'PAID', 'pay_1');

      expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch payment details'), 'Razorpay failure');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      spyWarn.mockRestore();
    });

    test('redeems voucher and updates NikasiTransaction with discount + amount', async () => {
      const payment = { 
        id: 'ord_1', 
        farmerId: 'farmer_1', 
        amount: '80.00', 
        status: 'PENDING', 
        voucherCode: 'SAVE20', 
        discountAmount: '20.00' 
      };
      
      const bills = {
        rows: [
          { id: 'bill_1', balanceDueAmount: '150.00', paidAmount: '0.00' }
        ]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // UPDATE Payment
        .mockResolvedValueOnce(bills) // SELECT NikasiTransaction
        .mockResolvedValueOnce({ rows: [] }); // UPDATE NikasiTransaction

      voucherService.redeemVoucherTransaction.mockResolvedValueOnce(20);

      await paymentRepository.updatePaymentStatus('ord_1', 'PAID');

      expect(voucherService.redeemVoucherTransaction).toHaveBeenCalledWith(
        'SAVE20',
        'farmer_1',
        100,
        'ord_1',
        mockClient
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "NikasiTransaction"'),
        [50, 100, 'bill_1']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('allocates PAID amount to NikasiTransaction balances sequentially and handles null paidAmount', async () => {
      const payment = { id: 'ord_1', farmerId: 'farmer_1', amount: '250.00', status: 'PENDING' };
      const bills = {
        rows: [
          { id: 'bill_1', balanceDueAmount: '100.00', paidAmount: '50.00' },
          { id: 'bill_2', balanceDueAmount: '200.00', paidAmount: null }, // testing || 0 fallback
          { id: 'bill_3', balanceDueAmount: '100.00', paidAmount: '0.00' }
        ]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // UPDATE Payment
        .mockResolvedValueOnce(bills) // SELECT NikasiTransaction
        .mockResolvedValueOnce({ rows: [] }) // UPDATE bill_1
        .mockResolvedValueOnce({ rows: [] }); // UPDATE bill_2

      await paymentRepository.updatePaymentStatus('ord_1', 'PAID', 'pay_1');

      // bill_1 gets 100, remainingPaid becomes 150
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "NikasiTransaction"'), [0, 150, 'bill_1']);
      // bill_2 gets 150, remainingPaid becomes 0
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "NikasiTransaction"'), [50, 150, 'bill_2']);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('skips Razorpay fetch if paymentId is missing', async () => {
      const payment = { id: 'ord_1', farmerId: 'farmer_1', amount: '0.00', status: 'PENDING' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // UPDATE Payment

      await paymentRepository.updatePaymentStatus('ord_1', 'PAID', null);

      expect(razorpayService.fetchPaymentDetails).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('handles Razorpay fetch details without method', async () => {
      const payment = { id: 'ord_1', farmerId: 'farmer_1', amount: '0.00', status: 'PENDING' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // UPDATE Payment

      razorpayService.fetchPaymentDetails.mockResolvedValueOnce({
        id: 'pay_1',
        acquirer_data: { bank_transaction_id: 'HDFC123' }
      });

      await paymentRepository.updatePaymentStatus('ord_1', 'PAID', 'pay_1');

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "Payment"'), [
        'PAID',
        'pay_1',
        'UPI Provider',
        'HDFC123',
        null,
        'ord_1'
      ]);
    });

    test('breaks loop if remainingPaid is 0', async () => {
      const payment = { id: 'ord_1', farmerId: 'farmer_1', amount: '0.00', status: 'PENDING' };
      const bills = {
        rows: [
          { id: 'bill_1', balanceDueAmount: '100.00', paidAmount: '50.00' }
        ]
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // UPDATE Payment
        .mockResolvedValueOnce(bills); // SELECT NikasiTransaction

      await paymentRepository.updatePaymentStatus('ord_1', 'PAID', 'pay_1');

      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE "NikasiTransaction"'), expect.any(Array));
    });

    test('rolls back transaction on database error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('DB Query Failed'));
      await expect(
        paymentRepository.updatePaymentStatus('ord_1', 'PAID')
      ).rejects.toThrow('DB Query Failed');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('rolls back transaction on db connection failure', async () => {
      db.connect.mockRejectedValueOnce(new Error('Connect failed'));
      await expect(
        paymentRepository.updatePaymentStatus('ord_1', 'PAID')
      ).rejects.toThrow('Connect failed');
    });

    test('updates status but skips Nikasi updates if new status is not PAID', async () => {
      const payment = { id: 'ord_1', farmerId: 'farmer_1', amount: '300.00', status: 'PENDING' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // UPDATE Payment
      
      await paymentRepository.updatePaymentStatus('ord_1', 'FAILED', 'pay_1');

      // fetchPaymentDetails should not be called since status isn't PAID (actually it only checks if pay_1 exists in fetch, but let's check Nikasi isn't queried)
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE "NikasiTransaction"'), expect.any(Array));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('getPaymentDetailsWithFarmerInfo', () => {
    test('returns null if payment not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      const result = await paymentRepository.getPaymentDetailsWithFarmerInfo('pay_1');
      expect(result).toBeNull();
    });

    test('returns details and falls back on missing farmer and CS names', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 'pay_1', farmerId: 'f_1', coldStorageId: 'cs_1', amount: 500 }] })
        .mockResolvedValueOnce({ rows: [] }) // Farmer empty
        .mockResolvedValueOnce({ rows: [] }); // ColdStorage empty

      const result = await paymentRepository.getPaymentDetailsWithFarmerInfo('pay_1');
      expect(result).toEqual({
        payment: expect.objectContaining({ id: 'pay_1' }),
        farmer: { name: 'Unknown Farmer', phone: '' },
        csName: 'Cold Storage'
      });
    });

    test('returns details with real farmer and CS name info', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 'pay_1', farmerId: 'f_1', coldStorageId: 'cs_1', amount: 500 }] })
        .mockResolvedValueOnce({ rows: [{ name: 'Ram Singh', phone: '123' }] })
        .mockResolvedValueOnce({ rows: [{ displayName: 'Best CS' }] });

      const result = await paymentRepository.getPaymentDetailsWithFarmerInfo('pay_1');
      expect(result).toEqual({
        payment: expect.objectContaining({ id: 'pay_1' }),
        farmer: { name: 'Ram Singh', phone: '123' },
        csName: 'Best CS'
      });
    });
  });

  describe('getPaymentById', () => {
    test('returns payment object or null', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      let result = await paymentRepository.getPaymentById('p1');
      expect(result).toBeNull();

      db.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }] });
      result = await paymentRepository.getPaymentById('p1');
      expect(result).toEqual({ id: 'p1' });
    });
  });

  describe('initiateManualPayment', () => {
    test('inserts record and returns row', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }] });
      const result = await paymentRepository.initiateManualPayment('p1', 'f1', 'cs1', 100, 'UPI');
      expect(db.query).toHaveBeenCalledWith(expect.any(String), ['p1', 'f1', 'cs1', 100, 'UPI']);
      expect(result).toEqual({ id: 'p1' });
    });
  });

  describe('verifyManualPaymentTx', () => {
    test('returns 404 error if payment record not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Payment query
      const result = await paymentRepository.verifyManualPaymentTx('p1', 'utr1', 'path', '2026-07-14', 'UPI', 'SBI');
      expect(result).toEqual({ success: false, status: 404, error: 'Payment record not found' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('returns duplicate status if UTR reference is already used', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'p1' }] }) // Payment SELECT
        .mockResolvedValueOnce({ rows: [{ id: 'other_pay' }] }); // Duplicate check

      const result = await paymentRepository.verifyManualPaymentTx('p1', 'utr1', 'path', '2026-07-14', 'UPI', 'SBI');
      expect(result).toEqual({ success: false, duplicate: true, payment: { id: 'p1' } });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('updates manual payment parameters successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'p1' }] }) // Payment SELECT
        .mockResolvedValueOnce({ rows: [] }) // Duplicate check
        .mockResolvedValueOnce({ rows: [] }); // UPDATE Payment

      const result = await paymentRepository.verifyManualPaymentTx('p1', 'utr1', 'path', '2026-07-14', 'UPI', 'SBI');
      expect(result).toEqual({ success: true, payment: { id: 'p1' } });
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "Payment"'), [
        'utr1', 'path', '2026-07-14', 'p1', 'UPI', 'SBI'
      ]);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('rolls back on database verification failure', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('fail'));
      await expect(
        paymentRepository.verifyManualPaymentTx('p1', 'utr1', 'path', '2026-07-14', 'UPI', 'SBI')
      ).rejects.toThrow('fail');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('approvePaymentTx', () => {
    test('returns 404 error if payment record not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Payment check
      const result = await paymentRepository.approvePaymentTx('p1');
      expect(result).toEqual({ success: false, error: 'Payment record not found', status: 404 });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('approves payment, handles remainingAmount >= due, and deletes app notification with null paidAmount', async () => {
      const payment = { id: 'p1', amount: '150.00', farmerId: 'f1', reference: 'ref1', coldStorageId: 'cs1' };
      const bills = {
        rows: [
          { id: 'bill_1', balanceDueAmount: '100.00', paidAmount: '10.00' },
          { id: 'bill_2', balanceDueAmount: '100.00', paidAmount: null }, // testing fallback
          { id: 'bill_3', balanceDueAmount: '100.00', paidAmount: '0.00' }
        ]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [payment] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // UPDATE Payment status
        .mockResolvedValueOnce(bills) // SELECT NikasiTransaction
        .mockResolvedValueOnce({ rows: [] }) // UPDATE bill_1 (remaining 150 >= due 100)
        .mockResolvedValueOnce({ rows: [] }) // UPDATE bill_2 (remaining 50 < due 100)
        .mockResolvedValueOnce({ rows: [] }); // DELETE AppNotification

      const result = await paymentRepository.approvePaymentTx('p1');
      expect(result).toEqual({ success: true, payment });

      // bill_1 paid (110)
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('"balanceDueAmount" = 0'), [110, 'bill_1']);
      // bill_2 partially paid (paidAmount: 0 + remaining 50 = 50, balanceDueAmount: 100 - 50 = 50)
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('"balanceDueAmount" = $1'), [50, 50, 'bill_2']);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('rolls back on db approval failure', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('fail'));
      await expect(
        paymentRepository.approvePaymentTx('p1')
      ).rejects.toThrow('fail');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
