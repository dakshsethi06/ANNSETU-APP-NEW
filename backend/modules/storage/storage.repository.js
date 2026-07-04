const db = require('../../config/database');

async function getColdStorages() {
  const result = await db.query('SELECT id, "displayName" AS name, phone, city, district, state FROM "ColdStorageOnboarding" ORDER BY "displayName" ASC');
  return result.rows;
}

async function createColdStorage(params) {
  const sql = `
    INSERT INTO "ColdStorageOnboarding" (
      "id", "storageCode", "legalName", "displayName", "contactPerson",
      "phone", "email", "city", "district", "state", "address",
      "capacityQtl", "roomCount", "status", "requestedAt", "approvedAt",
      "createdAt", "updatedAt", "consentGiven", "consentDate", "consentPurpose", "consentVersion", "mpin"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
  `;
  await db.query(sql, params);
}

async function getStorageSummaryData(coldStorageId) {
  const csRes = await db.query('SELECT id, "displayName", city, district, state, address FROM "ColdStorageOnboarding" WHERE id = $1', [coldStorageId]);
  if (csRes.rows.length === 0) return null;
  const cs = csRes.rows[0];

  const stockRes = await db.query('SELECT SUM("availablePackets") as active_packets, SUM("availableWeightQtl") as active_weight, SUM(packets) as total_packets, SUM("weightQtl") as total_weight FROM "AmadLot" WHERE "coldStorageId" = $1', [coldStorageId]);
  const stock = stockRes.rows[0];

  const duesRes = await db.query('SELECT SUM("balanceDueAmount") as total_dues, COUNT(DISTINCT "farmerId") as farmers_count FROM "NikasiTransaction" WHERE "coldStorageId" = $1 AND "balanceDueAmount" > 0', [coldStorageId]);
  const dues = duesRes.rows[0];

  const todayRes = await db.query('SELECT COUNT(*) as entries_count, SUM(packets) as packets_count FROM "AmadLot" WHERE "coldStorageId" = $1 AND DATE("amadDate") = CURRENT_DATE', [coldStorageId]);
  const today = todayRes.rows[0];

  const activityRes = await db.query(`SELECT id, commodity, kism, "roomId", "rackId", packets, "weightQtl", "goodsCondition" as status, "amadDate" FROM "AmadLot" WHERE "coldStorageId" = $1 ORDER BY "amadDate" DESC LIMIT 5`, [coldStorageId]);

  return { cs, stock, dues, today, activity: activityRes.rows };
}

module.exports = { getColdStorages, createColdStorage, getStorageSummaryData };
