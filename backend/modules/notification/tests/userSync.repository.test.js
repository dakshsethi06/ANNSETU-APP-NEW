const db = require('../../../config/database');
const userSync = require('../repositories/userSync.repository');
const { hashMpin } = require('../../../shared/utils/mpinUtils');

jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('userSync.repository unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserForFarmer', () => {
    test('returns true if user exists', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'farmer1' }] });
      const result = await userSync.getUserForFarmer('farmer1');
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id FROM "User"'), ['farmer1']);
      expect(result).toBe(true);
    });

    test('returns false if user does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      const result = await userSync.getUserForFarmer('farmer1');
      expect(result).toBe(false);
    });
  });

  test('getFarmerDetails', async () => {
    const row = { name: 'Ram', coldStorageId: 'CS1', mpin: '123', email: 'ram@mail.com' };
    db.query.mockResolvedValueOnce({ rows: [row] });
    const result = await userSync.getFarmerDetails('farmer1');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "Farmer" WHERE id = $1'), ['farmer1']);
    expect(result).toEqual(row);
  });

  test('insertShadowUser', async () => {
    db.query.mockResolvedValueOnce();
    const params = ['f1', 'name', 'mail', 'pass', 'OPERATOR', true, null, null, 'cs1', 1];
    await userSync.insertShadowUser(params);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO "User"'), params);
  });

  describe('upsertUserPushToken', () => {
    test('farmer branch: resolves name, mpin, and coldStorageId from Farmer table', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ name: 'Ram Singh', mpin: 'hashed_mpin', coldStorageId: 'CS_REAL' }]
        }) // Farmer query
        .mockResolvedValueOnce(); // Insert query

      await userSync.upsertUserPushToken('farmer1', 'ram@mail.com', 'push_token_123');

      expect(db.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM "Farmer" WHERE id = $1'), ['farmer1']);
      expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO "User"'), [
        'farmer1',
        'Ram Singh',
        'ram@mail.com',
        'hashed_mpin',
        'CS_REAL',
        'push_token_123'
      ]);
    });

    test('farmer branch: uses fallback password "1234" if mpin is null', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ name: 'Ram Singh', mpin: null, coldStorageId: 'CS_REAL' }]
        }) // Farmer query
        .mockResolvedValueOnce(); // Insert query

      await userSync.upsertUserPushToken('farmer1', 'ram@mail.com', 'push_token_123');

      expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [
        'farmer1',
        'Ram Singh',
        'ram@mail.com',
        '1234',
        'CS_REAL',
        'push_token_123'
      ]);
    });

    test('cold storage branch: resolves displayName, mpin, and sets coldStorageId = userId', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Farmer lookup: not found
        .mockResolvedValueOnce({
          rows: [{ displayName: 'Sharma CS', mpin: 'cs_mpin' }]
        }) // CS lookup: found
        .mockResolvedValueOnce(); // Insert query

      await userSync.upsertUserPushToken('cs123', 'cs@mail.com', 'push_token_123');

      expect(db.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM "Farmer" WHERE id = $1'), ['cs123']);
      expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM "ColdStorageOnboarding" WHERE id = $1'), ['cs123']);
      expect(db.query).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO "User"'), [
        'cs123',
        'Sharma CS',
        'cs@mail.com',
        'cs_mpin',
        'cs123',
        'push_token_123'
      ]);
    });

    test('cold storage branch: uses fallback hashed "1234" if mpin is null', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ displayName: 'Sharma CS', mpin: null }]
        })
        .mockResolvedValueOnce();

      await userSync.upsertUserPushToken('cs123', 'cs@mail.com', 'push_token_123');

      expect(db.query).toHaveBeenNthCalledWith(3, expect.any(String), [
        'cs123',
        'Sharma CS',
        'cs@mail.com',
        hashMpin('1234'),
        'cs123',
        'push_token_123'
      ]);
    });

    test('throws error if coldStorageId is not resolved', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Farmer lookup: empty
        .mockResolvedValueOnce({ rows: [] }); // CS lookup: empty

      await expect(
        userSync.upsertUserPushToken('ghost_user', 'ghost@mail.com', 'push_token_123')
      ).rejects.toThrow('coldStorageId is required for user push token upsert.');

      expect(db.query).toHaveBeenCalledTimes(2);
    });
  });
});
