const db = require('../db');

async function createAmadLot(params) {
  const sql = `
    INSERT INTO "AmadLot" (
      "id", "farmerId", "coldStorageId", "commodity", "kism", 
      "roomId", "rackId", "packets", "weightQtl", "availablePackets", "availableWeightQtl", "goodsCondition", "amadDate"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;
  const result = await db.query(sql, params);
  return result.rows[0];
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

module.exports = {
  createAmadLot,
  getFarmer,
  getHoldingsData
};
