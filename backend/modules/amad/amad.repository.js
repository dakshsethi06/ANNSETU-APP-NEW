const db = require('../../config/database');

async function createAmadLot(params) {
  const sql = `
    INSERT INTO "AmadLot" (
      "id", "amadNumber", "marka", "farmerId", "coldStorageId", "commodity", "kism", 
      "roomId", "rackId", "packets", "weightQtl", "availablePackets", "availableWeightQtl", "goodsCondition", "amadDate",
      "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;
  const result = await db.query(sql, params);
  return result.rows[0];
}

async function getFirstRoomForStorage(coldStorageId) {
  const res = await db.query('SELECT id FROM "Room" WHERE "coldStorageId" = $1 LIMIT 1', [coldStorageId]);
  if (res.rows.length > 0) return res.rows[0];
  const fallbackRes = await db.query('SELECT id FROM "Room" LIMIT 1');
  return fallbackRes.rows[0];
}

async function getFarmer(farmerId) {
  const farmerRes = await db.query('SELECT name, phone FROM "Farmer" WHERE id = $1', [farmerId]);
  return farmerRes.rows[0] || { name: 'Farmer', phone: null };
}

async function getHoldingsData() {
  const sql = `
    SELECT 
      a.id AS lot_id,
      a.commodity AS crop,
      a.kism AS variety,
      c."displayName" AS cold_storage,
      a."coldStorageId" AS cold_storage_id,
      a."roomId" AS location,
      a.packets AS bags,
      a."weightQtl" || ' Qt' AS weight,
      COALESCE(a."goodsCondition", 'Good') AS status,
      a."amadDate",
      a."farmerId" AS id
    FROM "AmadLot" a
    LEFT JOIN "ColdStorageOnboarding" c ON a."coldStorageId" = c.id
  `;
  const result = await db.query(sql);
  return result.rows;
}

async function getAmadLotById(lotId) {
  const res = await db.query('SELECT * FROM "AmadLot" WHERE id = $1', [lotId]);
  return res.rows[0];
}

async function updateAmadLotStatus(lotId, status) {
  const res = await db.query(
    'UPDATE "AmadLot" SET "goodsCondition" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
    [status, lotId]
  );
  return res.rows[0];
}

module.exports = {
  createAmadLot,
  getFarmer,
  getHoldingsData,
  getFirstRoomForStorage,
  getAmadLotById,
  updateAmadLotStatus
};
