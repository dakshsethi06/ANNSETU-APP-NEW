const db = require('../../../config/database');
const { hashMpin } = require('../../../shared/utils/mpinUtils');

async function getUserForFarmer(farmerId) {
  const userRes = await db.query('SELECT id FROM "User" WHERE id = $1', [farmerId]);
  return userRes.rows.length > 0;
}

async function getFarmerDetails(farmerId) {
  const farmerRes = await db.query(
    'SELECT name, "coldStorageId", mpin, email FROM "Farmer" WHERE id = $1',
    [farmerId]
  );
  return farmerRes.rows[0];
}

async function insertShadowUser(params) {
  await db.query(
    `INSERT INTO "User" (
      "id", "name", "email", "passwordHash", "role", 
      "active", "createdAt", "updatedAt", "coldStorageId", "sessionVersion"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id) DO UPDATE SET 
      "passwordHash" = EXCLUDED."passwordHash",
      "name" = EXCLUDED."name",
      "updatedAt" = NOW()`,
    params
  );
}

async function upsertUserPushToken(userId, email, pushToken) {
  let passwordHash = 'dummy_hash';
  let name = userId;
  let coldStorageId = null;

  const farmerRes = await db.query('SELECT name, mpin, "coldStorageId" FROM "Farmer" WHERE id = $1', [userId]);
  if (farmerRes.rows.length > 0) {
    name = farmerRes.rows[0].name;
    passwordHash = farmerRes.rows[0].mpin || '1234';
    coldStorageId = farmerRes.rows[0].coldStorageId;
  } else {
    const csRes = await db.query('SELECT "displayName", mpin FROM "ColdStorageOnboarding" WHERE id = $1', [userId]);
    if (csRes.rows.length > 0) {
      name = csRes.rows[0].displayName;
      passwordHash = csRes.rows[0].mpin || hashMpin('1234');
      coldStorageId = userId;
    }
  }

  if (!coldStorageId) {
    throw new Error('coldStorageId is required for user push token upsert.');
  }

  await db.query(
    `INSERT INTO "User" (
      "id", "name", "email", "passwordHash", "role", 
      "active", "createdAt", "updatedAt", "coldStorageId", "sessionVersion", "pushToken"
    ) VALUES ($1, $2, $3, $4, 'OPERATOR', true, NOW(), NOW(), $5, 1, $6)
    ON CONFLICT (id) DO UPDATE SET 
      "pushToken" = EXCLUDED."pushToken", 
      "passwordHash" = EXCLUDED."passwordHash", 
      "name" = EXCLUDED."name",
      "updatedAt" = NOW()`,
    [userId, name, email, passwordHash, coldStorageId, pushToken]
  );
}

module.exports = {
  getUserForFarmer,
  getFarmerDetails,
  insertShadowUser,
  upsertUserPushToken
};
