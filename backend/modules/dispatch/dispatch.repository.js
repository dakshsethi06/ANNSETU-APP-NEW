const db = require('../../config/database');

/**
 * Fetch dispatches filtered by farmerId or coldStorageId.
 * @param {{ farmerId?: string, coldStorageId?: string }} filter
 * @returns {Promise<Array>}
 */
async function getDispatchesData(filter) {
  const baseSql = `
    SELECT 
      n.id, 
      n."nikasiNumber" AS id_display,
      n."createdAt" AS date,
      n."packetsDispatched" AS bags,
      n."weightQtl" AS weight,
      n."vehicleNumber" AS vehicle,
      n.status,
      n."dispatchTo" AS buyer,
      f.name AS farmer_name,
      c."displayName" AS cold_storage_name,
      COALESCE(n."remarkEnglish", a.commodity, 'Potato') AS commodity
    FROM "NikasiTransaction" n
    LEFT JOIN "Farmer" f ON n."farmerId" = f.id
    LEFT JOIN "AmadLot" a ON n."lotId" = a.id
    LEFT JOIN "ColdStorageOnboarding" c ON n."coldStorageId" = c.id
  `;

  if (filter.farmerId) {
    const sql = baseSql + ` WHERE n."farmerId" = $1 ORDER BY n."createdAt" DESC`;
    const result = await db.query(sql, [filter.farmerId]);
    return result.rows;
  }

  // For coldStorageId, verify it exists first
  const verifiedId = await verifyColdStorage(filter.coldStorageId);
  const sql = baseSql + ` WHERE n."coldStorageId" = $1 ORDER BY n."createdAt" DESC`;
  const result = await db.query(sql, [verifiedId]);
  return result.rows;
}

/**
 * Fetch a single dispatch (NikasiTransaction) by its ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getDispatchById(id) {
  const result = await db.query('SELECT * FROM "NikasiTransaction" WHERE "id" = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Insert a new dispatch into NikasiTransaction.
 * @param {Object} params
 * @returns {Promise<Object>} The created row.
 */
async function insertDispatch({ id, nikasiNumber, farmerId, coldStorageId, lotId, bags, weightQtl, commodity, vehicleNumber }) {
  const sql = `
    INSERT INTO "NikasiTransaction" (
      "id", "nikasiNumber", "farmerId", "coldStorageId", "lotId", 
      "packetsDispatched", "weightQtl", "dispatchType", "dispatchTo", 
      "vehicleNumber", "remarkEnglish", "status", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    RETURNING *
  `;
  const params = [
    id, nikasiNumber, farmerId, coldStorageId, lotId,
    Number.parseInt(bags, 10), weightQtl, 'Farmer Withdrawal', 'Farmer',
    vehicleNumber || null, commodity, 'CREATED'
  ];
  const result = await db.query(sql, params);
  return result.rows[0];
}

/**
 * Update the status of a dispatch transaction.
 * @param {string} id
 * @param {string} status  e.g. 'IN_TRANSIT', 'DISPATCHED'
 * @returns {Promise<Object|null>}
 */
async function updateDispatchStatus(id, status) {
  const sql = `
    UPDATE "NikasiTransaction"
    SET "status" = $2, "updatedAt" = NOW()
    WHERE "id" = $1
    RETURNING *
  `;
  const result = await db.query(sql, [id, status]);
  return result.rows[0] || null;
}

/**
 * Find an active AmadLot for a farmer+commodity dispatch.
 * Falls back to any lot for the farmer, then any lot in the DB.
 * @param {string} farmerId
 * @param {string} commodity
 * @returns {Promise<string|null>} lotId or null
 */
async function getActiveLotForDispatch(farmerId, commodity) {
  // 1. Exact commodity match
  let res = await db.query(
    `SELECT id FROM "AmadLot" WHERE "farmerId" = $1 AND "commodity" ILIKE $2 LIMIT 1`,
    [farmerId, commodity]
  );
  if (res.rows.length > 0) return res.rows[0].id;

  // 2. Any lot for this farmer
  res = await db.query(
    `SELECT id FROM "AmadLot" WHERE "farmerId" = $1 LIMIT 1`,
    [farmerId]
  );
  if (res.rows.length > 0) return res.rows[0].id;

  return null;
}

/**
 * Verify that a ColdStorageOnboarding record exists for the given ID.
 * Returns the verified ID or a default fallback.
 * @param {string} coldStorageId
 * @returns {Promise<string>}
 */
async function verifyColdStorage(coldStorageId) {
  if (!coldStorageId) {
    throw new Error('coldStorageId is required.');
  }
  const res = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [coldStorageId]);
  if (res.rows.length === 0) {
    throw new Error(`Cold Storage record with ID "${coldStorageId}" not found.`);
  }
  return coldStorageId;
}

/**
 * Fetch farmer's MPIN and name.
 * @param {string} farmerId
 * @returns {Promise<Object|null>}
 */
async function getFarmerWithMpin(farmerId) {
  const res = await db.query('SELECT mpin, name FROM "Farmer" WHERE id = $1', [farmerId]);
  return res.rows[0] || null;
}

/**
 * Fetch cold storage display name.
 * @param {string} coldStorageId
 * @returns {Promise<string>}
 */
async function getColdStorageName(coldStorageId) {
  const res = await db.query('SELECT "displayName" FROM "ColdStorageOnboarding" WHERE id = $1', [coldStorageId]);
  return res.rows.length > 0 ? res.rows[0].displayName : 'Cold Storage';
}

/**
 * Fetch cold storage's MPIN and display name.
 * @param {string} coldStorageId
 * @returns {Promise<Object|null>}
 */
async function getColdStorageWithMpin(coldStorageId) {
  const res = await db.query('SELECT id, "displayName", mpin FROM "ColdStorageOnboarding" WHERE id = $1', [coldStorageId]);
  return res.rows[0] || null;
}

/**
 * Delete matching AppNotification rows.
 * @param {string} userId
 * @param {string} title
 * @param {string} messageLike  SQL LIKE pattern
 */
async function deleteNotification(userId, title, messageLike) {
  await db.query(
    `DELETE FROM "AppNotification" 
     WHERE "userId" = $1 
       AND "title" = $2 
       AND "message" LIKE $3`,
    [userId, title, messageLike]
  );
}

module.exports = {
  getDispatchesData,
  getDispatchById,
  insertDispatch,
  updateDispatchStatus,
  getActiveLotForDispatch,
  verifyColdStorage,
  getFarmerWithMpin,
  getColdStorageName,
  getColdStorageWithMpin,
  deleteNotification
};

