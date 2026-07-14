const dispatchRepo = require('../dispatch.repository');
const { createNewDispatch } = require('../dispatch.service');

jest.mock('../dispatch.repository', () => ({
  getActiveLotForDispatch: jest.fn(),
  verifyColdStorage: jest.fn(),
  getColdStorageName: jest.fn(),
  insertDispatch: jest.fn()
}));

jest.mock('../../../shared/notifications/notifications', () => ({
  createAppNotification: jest.fn()
}));

describe('Stock Calculation Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should compute weight in quintals correctly for dispatches', async () => {
    dispatchRepo.getActiveLotForDispatch.mockResolvedValue('lot_123');
    dispatchRepo.verifyColdStorage.mockResolvedValue('cs_123');
    dispatchRepo.getColdStorageName.mockResolvedValue('SN Sharma Cold Storage');
    dispatchRepo.insertDispatch.mockImplementation((data) => Promise.resolve(data));

    const data = {
      farmerId: 'farmer_123',
      coldStorageId: 'cs_123',
      commodity: 'Potato',
      bags: '100',
      vehicleNumber: 'RJ-14-1234'
    };

    const result = await createNewDispatch(data);

    // 1 bag = 0.5 Qtl. 100 bags = 50.0 Qtl
    expect(result.weightQtl).toBe(50.0);
    expect(dispatchRepo.insertDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        weightQtl: 50.0,
        bags: '100'
      })
    );
  });
});
