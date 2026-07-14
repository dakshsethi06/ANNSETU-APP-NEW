jest.mock('../../../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../../../config/database');
const { getApprovedFacilities, getActiveLots } = require('../cron.repository');

describe('cron.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApprovedFacilities', () => {
    test('queries database for approved facilities and returns them', async () => {
      const mockFacilities = [
        { id: 'cs-1', displayName: 'Cold Storage 1' },
        { id: 'cs-2', displayName: 'Cold Storage 2' }
      ];
      db.query.mockResolvedValue({ rows: mockFacilities });

      const result = await getApprovedFacilities();

      expect(result).toEqual(mockFacilities);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT id, \"displayName\" FROM \"ColdStorageOnboarding\" WHERE status = 'APPROVED'")
      );
    });
  });

  describe('getActiveLots', () => {
    test('queries active lots for a facility and returns them', async () => {
      const mockLots = [
        { id: 'lot-1', farmerId: 'farmer-1', crop: 'Potato', bags: 100, availablePackets: 50, amadDate: '2026-05-01' }
      ];
      db.query.mockResolvedValue({ rows: mockLots });

      const result = await getActiveLots('cs-1');

      expect(result).toEqual(mockLots);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, "farmerId", commodity AS crop, packets AS bags, "availablePackets", "amadDate"'),
        ['cs-1']
      );
    });
  });
});
