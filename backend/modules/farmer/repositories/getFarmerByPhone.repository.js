const db = require('../../../config/database');

async function getFarmerByPhone(phone) {
  const cleanPhone = phone.replace('+91', '').trim();
  const result = await db.query(
    `SELECT * FROM "Farmer" 
     WHERE "phone" = $1 
        OR "phone" = $2 
        OR "id" = $1 
        OR "id" = $2 
     LIMIT 1`,
    [cleanPhone, '+91' + cleanPhone]
  );
  return result.rows[0];
}

module.exports = { getFarmerByPhone };
