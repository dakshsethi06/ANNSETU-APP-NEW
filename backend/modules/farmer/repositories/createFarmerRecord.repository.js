const db = require('../../../config/database');

async function createFarmerRecord(params) {
  const sql = `
    INSERT INTO "Farmer" (
      "id", "accountNumber", "name", "state", "primaryCrop",
      "isLocalFarmer", "openingBalance", "creditLimit", "interestRate",
      "autoSmsReminder", "joinDate", "active", "createdAt", "updatedAt",
      "coldStorageId", "consentGiven", "phone", "fatherName", "village", "district", "tehsil", "mpin"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
  `;
  await db.query(sql, params);
}

module.exports = { createFarmerRecord };
