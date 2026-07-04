const db = require('../../config/database');

async function getApprovedFacilities() {
  const facilitiesRes = await db.query(`SELECT id, "displayName" FROM "ColdStorageOnboarding" WHERE status = 'APPROVED'`);
  return facilitiesRes.rows;
}

async function getActiveLots(facilityId) {
  const lotsRes = await db.query(
    `SELECT id, "farmerId", commodity AS crop, packets AS bags, "availablePackets", "amadDate"
     FROM "AmadLot"
     WHERE "coldStorageId" = $1 AND "availablePackets" > 0`,
    [facilityId]
  );
  return lotsRes.rows;
}

module.exports = { getApprovedFacilities, getActiveLots };
