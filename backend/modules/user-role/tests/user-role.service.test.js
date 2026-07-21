const userRoleService = require('../user-role.service');
const userRoleRepository = require('../user-role.repository');

jest.mock('../user-role.repository');

describe('user-role.service unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('determines user role as ColdStorageFacility when CS onboarding returns true', async () => {
    userRoleRepository.checkColdStorageOnboarding.mockResolvedValueOnce(true);

    const result = await userRoleService.determineUserRole('+919876543210');

    expect(userRoleRepository.checkColdStorageOnboarding).toHaveBeenCalledWith('9876543210'); // stripped +91 prefix
    expect(result).toBe('ColdStorageFacility');
  });

  test('determines user role as ColdStorage when CS onboarding returns false but farmer check is true', async () => {
    userRoleRepository.checkColdStorageOnboarding.mockResolvedValueOnce(false);
    userRoleRepository.checkFarmer.mockResolvedValueOnce(true);

    const result = await userRoleService.determineUserRole('9876543210');

    expect(userRoleRepository.checkFarmer).toHaveBeenCalledWith('9876543210');
    expect(result).toBe('ColdStorage');
  });

  test('falls back to ColdStorage when both onboarding and farmer checks return false', async () => {
    userRoleRepository.checkColdStorageOnboarding.mockResolvedValueOnce(false);
    userRoleRepository.checkFarmer.mockResolvedValueOnce(false);

    const result = await userRoleService.determineUserRole('9876543210');

    expect(result).toBe('ColdStorage');
  });
});
