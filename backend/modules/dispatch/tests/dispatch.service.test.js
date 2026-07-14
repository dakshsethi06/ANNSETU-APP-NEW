jest.mock('../dispatch.repository');
jest.mock('../../../shared/notifications/notifications', () => ({
  createAppNotification: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../config/constants', () => ({
  DEFAULT_COLD_STORAGE_ID: 'CS-DEFAULT',
}));

const dispatchRepo = require('../dispatch.repository');
const { createAppNotification } = require('../../../shared/notifications/notifications');
const { hashMpin } = require('../../../shared/utils/mpinUtils');
const {
  fetchDispatches,
  createNewDispatch,
  approveDispatchByMpin,
  markDispatchDelivered,
} = require('../dispatch.service');

describe('dispatch.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAppNotification.mockResolvedValue({});
  });

  describe('fetchDispatches', () => {
    test('delegates to the repository with the filter', async () => {
      const rows = [{ id: 'N1' }];
      dispatchRepo.getDispatchesData.mockResolvedValue(rows);
      const result = await fetchDispatches({ farmerId: 'F1' });
      expect(result).toEqual(rows);
      expect(dispatchRepo.getDispatchesData).toHaveBeenCalledWith({ farmerId: 'F1' });
    });
  });

  describe('createNewDispatch', () => {
    const data = {
      farmerId: 'F1', coldStorageId: 'CS1',
      commodity: 'Potato', bags: '50', vehicleNumber: 'RJ01AB1234',
    };

    beforeEach(() => {
      dispatchRepo.getActiveLotForDispatch.mockResolvedValue('AM-1');
      dispatchRepo.verifyColdStorage.mockResolvedValue('CS1');
      dispatchRepo.insertDispatch.mockResolvedValue({ id: 'NK-1', status: 'CREATED' });
      dispatchRepo.getColdStorageName.mockResolvedValue('Sharma CS');
    });

    test('throws 400 when farmer has no active lot', async () => {
      dispatchRepo.getActiveLotForDispatch.mockResolvedValue(null);
      await expect(createNewDispatch(data)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('No active stock lots'),
      });
      expect(dispatchRepo.insertDispatch).not.toHaveBeenCalled();
    });

    test('calculates weight as bags * 0.5 Qtl', async () => {
      await createNewDispatch(data);
      expect(dispatchRepo.insertDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ weightQtl: 25 }) // 50 * 0.5
      );
    });

    test('generates NK- prefixed id and nikasiNumber', async () => {
      await createNewDispatch(data);
      const arg = dispatchRepo.insertDispatch.mock.calls[0][0];
      expect(arg.id).toMatch(/^NK-\d+$/);
      expect(arg.nikasiNumber).toMatch(/^NK-\d{5}$/);
    });

    test('uses the verified cold storage id', async () => {
      dispatchRepo.verifyColdStorage.mockResolvedValue('CS-VERIFIED');
      await createNewDispatch(data);
      expect(dispatchRepo.insertDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ coldStorageId: 'CS-VERIFIED' })
      );
    });

    test('sends MPIN-authorization notification to the farmer', async () => {
      await createNewDispatch(data);
      expect(createAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'F1',
          title: 'Dispatch Approval Required',
          type: 'warning',
        })
      );
    });

    test('still returns dispatch when notification fails', async () => {
      createAppNotification.mockRejectedValue(new Error('notif down'));
      const result = await createNewDispatch(data);
      expect(result).toEqual({ id: 'NK-1', status: 'CREATED' });
    });

    test('propagates cold storage verification failure', async () => {
      dispatchRepo.verifyColdStorage.mockRejectedValue(
        new Error('Cold Storage record with ID "CS1" not found.')
      );
      await expect(createNewDispatch(data)).rejects.toThrow('not found');
      expect(dispatchRepo.insertDispatch).not.toHaveBeenCalled();
    });
  });

  describe('approveDispatchByMpin', () => {
    const dispatchRow = {
      id: 'NK-1', farmerId: 'F1', coldStorageId: 'CS1',
      packetsDispatched: 50, remarkEnglish: 'Potato',
    };

    beforeEach(() => {
      dispatchRepo.getDispatchById.mockResolvedValue(dispatchRow);
      dispatchRepo.getFarmerWithMpin.mockResolvedValue({
        name: 'Ram Singh',
        mpin: hashMpin('1234'),
      });
      dispatchRepo.updateDispatchStatus.mockResolvedValue({ ...dispatchRow, status: 'IN_TRANSIT' });
      dispatchRepo.deleteNotification.mockResolvedValue();
    });

    test('throws 404 when dispatch does not exist', async () => {
      dispatchRepo.getDispatchById.mockResolvedValue(null);
      await expect(approveDispatchByMpin('GHOST', '1234')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Dispatch transaction not found',
      });
    });

    test('throws 404 when farmer profile not found', async () => {
      dispatchRepo.getFarmerWithMpin.mockResolvedValue(null);
      await expect(approveDispatchByMpin('NK-1', '1234')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    test('throws 401 for wrong MPIN and does NOT update status', async () => {
      await expect(approveDispatchByMpin('NK-1', '9999')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid MPIN. Please try again.',
      });
      expect(dispatchRepo.updateDispatchStatus).not.toHaveBeenCalled();
    });

    test('approves with correct MPIN → status IN_TRANSIT', async () => {
      const result = await approveDispatchByMpin('NK-1', '1234');
      expect(result.status).toBe('IN_TRANSIT');
      expect(dispatchRepo.updateDispatchStatus).toHaveBeenCalledWith('NK-1', 'IN_TRANSIT');
    });

    test('works with legacy plain-text stored MPIN', async () => {
      dispatchRepo.getFarmerWithMpin.mockResolvedValue({ name: 'Ram', mpin: '5678' });
      const result = await approveDispatchByMpin('NK-1', '5678');
      expect(result.status).toBe('IN_TRANSIT');
    });

    test('SECURITY: farmer with NO mpin set — throws 403 Forbidden', async () => {
      // Validates that if a farmer hasn't set an MPIN, it fails closed instead of falling back to default
      dispatchRepo.getFarmerWithMpin.mockResolvedValue({ name: 'Ram', mpin: null });
      await expect(approveDispatchByMpin('NK-1', '1234')).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('MPIN not set'),
      });
    });

    test('cleans up pending notification and notifies vendor + cold storage', async () => {
      await approveDispatchByMpin('NK-1', '1234');
      expect(dispatchRepo.deleteNotification).toHaveBeenCalledWith(
        'F1',
        'Dispatch Approval Required',
        expect.stringContaining('50 bags')
      );
      // two approval notifications: vendor + cold storage
      expect(createAppNotification).toHaveBeenCalledTimes(2);
    });

    test('approval succeeds even if notification cleanup fails', async () => {
      dispatchRepo.deleteNotification.mockRejectedValue(new Error('cleanup failed'));
      const result = await approveDispatchByMpin('NK-1', '1234');
      expect(result.status).toBe('IN_TRANSIT');
    });

    test('approval succeeds even if notification cleanup fails', async () => {
      dispatchRepo.deleteNotification.mockRejectedValue(new Error('cleanup failed'));
      const result = await approveDispatchByMpin('NK-1', '1234');
      expect(result.status).toBe('IN_TRANSIT');
    });

    test('approval succeeds even if notification creation fails', async () => {
      createAppNotification.mockRejectedValue(new Error('creation failed'));
      const result = await approveDispatchByMpin('NK-1', '1234');
      expect(result.status).toBe('IN_TRANSIT');
    });

    test('uses fallback strings when dispatch data lacks remarkEnglish or coldStorageId', async () => {
      // Missing remarkEnglish and coldStorageId
      dispatchRepo.getDispatchById.mockResolvedValue({
        id: 'NK-1', farmerId: 'F1', packetsDispatched: 50
      });
      await approveDispatchByMpin('NK-1', '1234');
      
      // Verify notification fallback to 'goods'
      expect(createAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('goods')
        })
      );
    });
  });

  describe('markDispatchDelivered', () => {
    const delivered = {
      id: 'NK-1', farmerId: 'F1', coldStorageId: 'CS1',
      packetsDispatched: 50, remarkEnglish: 'Potato', status: 'DISPATCHED',
    };

    beforeEach(() => {
      dispatchRepo.updateDispatchStatus.mockResolvedValue(delivered);
      dispatchRepo.deleteNotification.mockResolvedValue();
      dispatchRepo.getColdStorageName.mockResolvedValue('Sharma CS');
    });

    test('throws 404 when dispatch not found', async () => {
      dispatchRepo.updateDispatchStatus.mockResolvedValue(null);
      await expect(markDispatchDelivered('GHOST')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    test('updates status to DISPATCHED and returns row', async () => {
      const result = await markDispatchDelivered('NK-1');
      expect(result.status).toBe('DISPATCHED');
      expect(dispatchRepo.updateDispatchStatus).toHaveBeenCalledWith('NK-1', 'DISPATCHED');
    });

    test('notifies the farmer of delivery', async () => {
      await markDispatchDelivered('NK-1');
      expect(createAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'F1',
          title: 'Dispatch Delivered',
        })
      );
    });

    test('delivery succeeds even when notifications fail', async () => {
      createAppNotification.mockRejectedValue(new Error('down'));
      const result = await markDispatchDelivered('NK-1');
      expect(result.status).toBe('DISPATCHED');
    });

    test('delivery succeeds even when notification cleanup fails', async () => {
      dispatchRepo.deleteNotification.mockRejectedValue(new Error('cleanup down'));
      const result = await markDispatchDelivered('NK-1');
      expect(result.status).toBe('DISPATCHED');
    });

    test('uses fallback strings when dispatch lacks remarkEnglish', async () => {
      dispatchRepo.updateDispatchStatus.mockResolvedValue({
        id: 'NK-1', farmerId: 'F1', packetsDispatched: 50, status: 'DISPATCHED'
      });
      await markDispatchDelivered('NK-1');
      
      expect(createAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('goods')
        })
      );
    });
  });
});