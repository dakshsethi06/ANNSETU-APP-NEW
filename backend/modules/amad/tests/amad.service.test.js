// Mock the two dependencies BEFORE requiring the service
jest.mock('../amad.repository');
jest.mock('../../../shared/notifications/notifications', () => ({
  logOutboundNotification: jest.fn().mockResolvedValue({}),
  createAppNotification: jest.fn().mockResolvedValue({}),
}));

const amadRepository = require('../amad.repository');
const {
  logOutboundNotification,
  createAppNotification,
} = require('../../../shared/notifications/notifications');
const { createNewAmadLot, fetchHoldings } = require('../amad.service');

describe('amad.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNewAmadLot', () => {
    const validData = {
      farmerId: 'F1',
      coldStorageId: 'CS1',
      commodity: 'Potato',
      packets: 100,
      weightQtl: 50,
    };

    const fakeLot = { id: 'AM-123', farmerId: 'F1', packets: 100 };
    const fakeFarmer = { name: 'Ram Singh', phone: '9876543210' };

    beforeEach(() => {
      amadRepository.createAmadLot.mockResolvedValue(fakeLot);
      amadRepository.getFarmer.mockResolvedValue(fakeFarmer);
    });

    test('throws 400 error when coldStorageId is missing', async () => {
      const { coldStorageId, ...noCS } = validData;
      await expect(createNewAmadLot(noCS)).rejects.toMatchObject({
        message: 'coldStorageId is required.',
        statusCode: 400,
      });
      expect(amadRepository.createAmadLot).not.toHaveBeenCalled();
    });

    test('creates lot with generated AM- id and defaults', async () => {
      const result = await createNewAmadLot(validData);
      expect(result).toEqual(fakeLot);

      const params = amadRepository.createAmadLot.mock.calls[0][0];
      expect(params[0]).toMatch(/^AM-\d+$/);   // generated id
      expect(params[1]).toBe('F1');            // farmerId
      expect(params[2]).toBe('CS1');           // coldStorageId
      expect(params[4]).toBeNull();            // kism defaults to null
      expect(params[9]).toBe(100);             // availablePackets = packets
      expect(params[10]).toBe(50);             // availableWeightQtl = weightQtl
      expect(params[11]).toBe('Fresh');        // goodsCondition default
    });

    test('passes through optional fields when provided', async () => {
      await createNewAmadLot({
        ...validData,
        kism: 'Jyoti',
        roomId: 'R2',
        goodsCondition: 'Damaged',
      });
      const params = amadRepository.createAmadLot.mock.calls[0][0];
      expect(params[4]).toBe('Jyoti');
      expect(params[5]).toBe('R2');
      expect(params[11]).toBe('Damaged');
    });

    test('triggers SMS and app notifications with farmer details', async () => {
      await createNewAmadLot(validData);
      expect(logOutboundNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AMAD_CREATED',
          recipientPhone: '9876543210',
          recipientName: 'Ram Singh',
        })
      );
      expect(createAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'F1', lotId: 'AM-123' })
      );
    });

    test('still returns the lot when notifications fail (non-blocking)', async () => {
      logOutboundNotification.mockRejectedValue(new Error('SMS gateway down'));
      const result = await createNewAmadLot(validData);
      expect(result).toEqual(fakeLot);   // creation succeeds despite notif failure
    });

    test('propagates repository errors (DB failure)', async () => {
      amadRepository.createAmadLot.mockRejectedValue(new Error('DB connection lost'));
      await expect(createNewAmadLot(validData)).rejects.toThrow('DB connection lost');
    });
  });

  describe('fetchHoldings', () => {
    test('maps rows and computes age_days', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      amadRepository.getHoldingsData.mockResolvedValue([
        {
          id: 'F1', lot_id: 'AM-1', crop: 'Potato', variety: 'Jyoti',
          cold_storage: 'Sharma CS', cold_storage_id: 'CS1', location: 'R1',
          bags: 100, weight: '50 Qt', status: 'Fresh', amadDate: threeDaysAgo,
        },
      ]);

      const result = await fetchHoldings();
      expect(result).toHaveLength(1);
      expect(result[0].age_days).toBe(3);
      expect(result[0].inbound_age).toBe('3d');
      expect(result[0].crop).toBe('Potato');
    });

    test('applies default values for missing fields', async () => {
      amadRepository.getHoldingsData.mockResolvedValue([
        {
          id: 'F1', lot_id: 'AM-2', crop: 'Onion', variety: null,
          cold_storage: null, cold_storage_id: 'CS1', location: null,
          bags: 10, weight: '5 Qt', status: 'Good', amadDate: new Date(),
        },
      ]);

      const result = await fetchHoldings();
      expect(result[0].variety).toBe('-');
      expect(result[0].cold_storage).toBe('Default CS');
      expect(result[0].location).toBe('Section A');
      expect(result[0].age_days).toBe(0);
    });

    test('returns empty array when no holdings exist', async () => {
      amadRepository.getHoldingsData.mockResolvedValue([]);
      const result = await fetchHoldings();
      expect(result).toEqual([]);
    });
  });
});