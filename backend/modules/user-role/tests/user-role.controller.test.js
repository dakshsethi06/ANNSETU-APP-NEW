const userRoleController = require('../user-role.controller');
const userRoleService = require('../user-role.service');

jest.mock('../user-role.service');

describe('user-role.controller unit tests', () => {
  let req, res, spyStatus, spyJson;

  beforeEach(() => {
    jest.clearAllMocks();
    spyStatus = jest.fn().mockReturnThis();
    spyJson = jest.fn();
    res = {
      status: spyStatus,
      json: spyJson
    };
  });

  test('getUserRole returns success: true and role when service resolves successfully', async () => {
    req = { query: { phone: '9876543210' } };
    userRoleService.determineUserRole.mockResolvedValueOnce('ColdStorageFacility');

    await userRoleController.getUserRole(req, res);

    expect(userRoleService.determineUserRole).toHaveBeenCalledWith('9876543210');
    expect(res.json).toHaveBeenCalledWith({ success: true, role: 'ColdStorageFacility' });
  });

  test('getUserRole returns status 500 when service throws an error', async () => {
    req = { query: { phone: '9876543210' } };
    userRoleService.determineUserRole.mockRejectedValueOnce(new Error('Internal Database Error'));
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await userRoleController.getUserRole(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal Database Error' });
    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });
});
