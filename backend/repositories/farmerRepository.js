const db = require('../db');

async function getFarmersData(state, serial_number) {
  let sql = `
    SELECT 
      f.id AS "serial_number", f.name, f.state, f."primaryCrop" AS commodity, 
      f."fatherName", f.phone, f.village, f.district, f.tehsil,
      COALESCE(SUM(nt."balanceDueAmount"), 0) AS "pendingRent"
    FROM "Farmer" f
    LEFT JOIN "NikasiTransaction" nt ON nt."farmerId" = f.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;
  
  if (state) {
    sql += ` AND f.state ILIKE $${paramIndex}`;
    params.push(state);
    paramIndex++;
  }
  if (serial_number) {
    sql += ` AND f.id = $${paramIndex}`;
    params.push(serial_number);
    paramIndex++;
  }
  
  sql += ` GROUP BY f.id, f.name, f.state, f."primaryCrop", f."fatherName", f.phone, f.village, f.district, f.tehsil`;
  
  const result = await db.query(sql, params);
  return result.rows;
}

async function createFarmerRecord(params) {
  const sql = `
    INSERT INTO "Farmer" (
      "id", "accountNumber", "name", "state", "primaryCrop",
      "isLocalFarmer", "openingBalance", "creditLimit", "interestRate",
      "autoSmsReminder", "joinDate", "active", "createdAt", "updatedAt",
      "coldStorageId", "consentGiven", "phone", "fatherName", "village", "district", "tehsil"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
  `;
  await db.query(sql, params);
}

module.exports = { getFarmersData, createFarmerRecord };
