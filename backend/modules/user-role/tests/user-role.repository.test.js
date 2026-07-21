const db = require('../../../config/database');
const userRoleRepository = require('../user-role.repository');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('user-role.repository unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkColdStorageOnboarding', () => {
    test('returns true when rows are returned', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'cs1' }] });

      const result = await userRoleRepository.checkColdStorageOnboarding('9876543210');

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "ColdStorageOnboarding"'), ['9876543210']);
      expect(result).toBe(true);
    });

    test('returns false when query rows are empty', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await userRoleRepository.checkColdStorageOnboarding('9876543210');

      expect(result).toBe(false);
    });
  });

  describe('checkFarmer', () => {
    test('returns true when rows are returned', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'farmer1' }] });

      const result = await userRoleRepository.checkFarmer('9876543210');

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "Farmer"'), ['9876543210']);
      expect(result).toBe(true);
    });

    test('returns false when query rows are empty', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await userRoleRepository.checkFarmer('9876543210');

      expect(result).toBe(false);
    });
  });
});
