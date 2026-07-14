jest.mock('../cron.repository');
jest.mock('../../../shared/notifications/notifications', () => ({
  createAppNotification: jest.fn().mockResolvedValue(true),
}));

const cronRepository = require('../cron.repository');
const { createAppNotification } = require('../../../shared/notifications/notifications');
const { runCropAgingAlerts } = require('../cron.service');

describe('cron.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runCropAgingAlerts', () => {
    test('does nothing when there are no approved facilities', async () => {
      cronRepository.getApprovedFacilities.mockResolvedValue([]);
      
      const result = await runCropAgingAlerts();

      expect(result.alertsCreated).toBe(0);
      expect(cronRepository.getApprovedFacilities).toHaveBeenCalled();
      expect(cronRepository.getActiveLots).not.toHaveBeenCalled();
    });

    test('should run and create notifications for aging and warning lots', async () => {
      const mockFacilities = [
        { id: 'cs-1', displayName: 'CS 1' }
      ];
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const seventyDaysAgo = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      const mockLots = [
        { id: 'lot-aging', farmerId: 'farmer-1', crop: 'Potato', availablePackets: 50, amadDate: hundredDaysAgo },
        { id: 'lot-warning', farmerId: 'farmer-2', crop: 'Onion', availablePackets: 30, amadDate: seventyDaysAgo },
        { id: 'lot-normal', farmerId: 'farmer-3', crop: 'Tomato', availablePackets: 20, amadDate: tenDaysAgo }
      ];

      cronRepository.getApprovedFacilities.mockResolvedValue(mockFacilities);
      cronRepository.getActiveLots.mockResolvedValue(mockLots);
      createAppNotification.mockResolvedValue(true);

      const result = await runCropAgingAlerts();

      expect(result.alertsCreated).toBe(2);
      expect(cronRepository.getActiveLots).toHaveBeenCalledWith('cs-1');

      // Aging lot >= 91 days
      expect(createAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          coldStorageId: 'cs-1',
          userId: 'farmer-1',
          lotId: 'lot-aging',
          type: 'aging',
          title: 'Aging Alert'
        })
      );

      // Warning lot >= 61 days and < 91 days
      expect(createAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          coldStorageId: 'cs-1',
          userId: 'farmer-2',
          lotId: 'lot-warning',
          type: 'warning',
          title: 'Crop Warning'
        })
      );

      // Normal lot should not trigger notification
      expect(createAppNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({
          lotId: 'lot-normal'
        })
      );
    });

    test('should not increment alertsCreated if createAppNotification returns falsy', async () => {
      const mockFacilities = [{ id: 'cs-1', displayName: 'CS 1' }];
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const mockLots = [
        { id: 'lot-aging', farmerId: 'farmer-1', crop: 'Potato', availablePackets: 50, amadDate: hundredDaysAgo }
      ];

      cronRepository.getApprovedFacilities.mockResolvedValue(mockFacilities);
      cronRepository.getActiveLots.mockResolvedValue(mockLots);
      createAppNotification.mockResolvedValue(false);

      const result = await runCropAgingAlerts();

      expect(result.alertsCreated).toBe(0);
    });

    test('should cover ageDays fallback when amadDate is current time (0 days age)', async () => {
      const mockFacilities = [{ id: 'cs-1', displayName: 'CS 1' }];
      const mockLots = [
        { id: 'lot-new', farmerId: 'farmer-1', crop: 'Potato', availablePackets: 50, amadDate: new Date() }
      ];

      cronRepository.getApprovedFacilities.mockResolvedValue(mockFacilities);
      cronRepository.getActiveLots.mockResolvedValue(mockLots);

      const result = await runCropAgingAlerts();

      expect(result.alertsCreated).toBe(0);
      expect(createAppNotification).not.toHaveBeenCalled();
    });
  });

});
