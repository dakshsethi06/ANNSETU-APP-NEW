const db = require('../../config/database');

async function checkColdStorageOnboarding(phone) {
  const res = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE phone = $1', [phone]);
  return res.rows.length > 0;
}

async function checkFarmer(phone) {
  const res = await db.query('SELECT id FROM "Farmer" WHERE phone = $1', [phone]);
  return res.rows.length > 0;
}

module.exports = { checkColdStorageOnboarding, checkFarmer };
