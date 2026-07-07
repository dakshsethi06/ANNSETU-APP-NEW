const db = require('../../../config/database');

async function getFarmersData(state, serial_number) {
  let sql = `
    SELECT 
      f.id AS "serial_number", f.name, f.state, f."primaryCrop" AS commodity, 
      f."fatherName", f.phone, f.village, f.district, f.tehsil,
      (
        COALESCE(f."openingBalance", 0)
        + COALESCE((SELECT SUM("totalBillAmount") FROM "NikasiTransaction" WHERE "farmerId" = f.id), 0)
        + COALESCE((SELECT SUM("amount") FROM "BillingEntry" WHERE "farmerId" = f.id), 0)
        - COALESCE((SELECT SUM("amount") FROM "Payment" WHERE "farmerId" = f.id AND "status" IN ('APPROVED', 'PAID')), 0)
      ) AS "pendingRent"
    FROM "Farmer" f
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
  
  const result = await db.query(sql, params);
  return result.rows;
}

module.exports = { getFarmersData };
