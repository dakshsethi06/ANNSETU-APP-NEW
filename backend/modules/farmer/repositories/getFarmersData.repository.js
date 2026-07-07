const db = require('../../../config/database');

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

module.exports = { getFarmersData };
