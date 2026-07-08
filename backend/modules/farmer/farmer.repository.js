const { getFarmersData } = require('./repositories/getFarmersData.repository');
const { createFarmerRecord } = require('./repositories/createFarmerRecord.repository');
const { getFarmerByPhone } = require('./repositories/getFarmerByPhone.repository');
const { getFarmerLedger } = require('./repositories/getFarmerLedger.repository');
const db = require('../../config/database');

async function getColdStorageByPhone(phone) {
  const res = await db.query('SELECT id, "displayName", mpin FROM "ColdStorageOnboarding" WHERE phone = $1', [phone]);
  return res.rows[0];
}

async function updateColdStorageMpin(id, hashedMpin) {
  await db.query(`UPDATE "ColdStorageOnboarding" SET "mpin" = $1, "updatedAt" = NOW() WHERE "id" = $2`, [hashedMpin, id]);
}

async function updateFarmerMpin(id, hashedMpin) {
  await db.query(`UPDATE "Farmer" SET "mpin" = $1, "updatedAt" = NOW() WHERE "id" = $2`, [hashedMpin, id]);
}

async function getFarmerBasicDetails(farmerId) {
  const res = await db.query('SELECT * FROM "Farmer" WHERE id = $1', [farmerId]);
  return res.rows[0];
}

async function getColdStorageDetailsForFarmer(coldStorageId) {
  const res = await db.query('SELECT "displayName", address, phone FROM "ColdStorageOnboarding" WHERE id = $1', [coldStorageId]);
  return res.rows[0];
}

async function getPaymentsForFarmer(farmerId) {
  const res = await db.query('SELECT * FROM "Payment" WHERE "farmerId" = $1 ORDER BY "createdAt" DESC', [farmerId]);
  return res.rows;
}

async function deleteOtpVerification(farmerId, targetType) {
  await db.query('DELETE FROM "OtpVerification" WHERE "farmerId" = $1 AND "targetType" = $2', [farmerId, targetType]);
}

async function insertOtpVerification(verificationId, farmerId, targetType, targetValue, otpCode) {
  await db.query(
    `INSERT INTO "OtpVerification" ("id", "farmerId", "targetType", "targetValue", "code", "expiresAt")
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 minutes')`,
    [verificationId, farmerId, targetType, targetValue, otpCode]
  );
}

async function getOtpVerification(farmerId, targetType) {
  const res = await db.query(
    'SELECT * FROM "OtpVerification" WHERE "farmerId" = $1 AND "targetType" = $2 AND "expiresAt" > NOW() ORDER BY "expiresAt" DESC LIMIT 1',
    [farmerId, targetType]
  );
  return res.rows[0];
}

async function updateFarmerProfile(id, name, fatherName, village, district, tehsil) {
  const res = await db.query(
    `UPDATE "Farmer" SET name = COALESCE($1, name), "fatherName" = COALESCE($2, "fatherName"),
     village = COALESCE($3, village), district = COALESCE($4, district), tehsil = COALESCE($5, tehsil),
     "updatedAt" = NOW() WHERE id = $6 RETURNING *`,
    [name, fatherName, village, district, tehsil, id]
  );
  return res.rows[0];
}

async function updateFarmerTarget(id, targetType, targetValue) {
  const column = targetType === 'phone' ? 'phone' : 'email';
  await db.query(`UPDATE "Farmer" SET "${column}" = $1, "updatedAt" = NOW() WHERE "id" = $2`, [targetValue, id]);
}

async function updateFarmerBasicDetails(id, finalName, finalPhone, finalEmail, finalAadhaar, finalPan) {
  const res = await db.query(
    `UPDATE "Farmer"
     SET "name" = $1,
         "phone" = $2,
         "email" = $3,
         "aadhaarNumber" = $4,
         "panNumber" = $5,
         "updatedAt" = NOW()
     WHERE "id" = $6
     RETURNING "id" AS "serial_number", "name", "state", "primaryCrop" AS commodity, "fatherName", "phone", "email", "village", "district", "tehsil", "aadhaarNumber", "panNumber"`,
    [finalName, finalPhone, finalEmail, finalAadhaar, finalPan, id]
  );
  return res.rows[0];
}

async function verifyAndUpdateFarmerProfile(id, finalName, finalPhone, finalEmail) {
  const res = await db.query(
    `UPDATE "Farmer"
     SET "name" = $1,
         "phone" = $2,
         "email" = $3,
         "updatedAt" = NOW()
     WHERE "id" = $4
     RETURNING "id" AS "serial_number", "name", "state", "primaryCrop" AS commodity, "fatherName", "phone", "email", "village", "district", "tehsil"`,
    [finalName, finalPhone, finalEmail, id]
  );
  return res.rows[0];
}

module.exports = {
  getFarmersData,
  createFarmerRecord,
  getFarmerByPhone,
  getFarmerLedger,
  getColdStorageByPhone,
  updateColdStorageMpin,
  updateFarmerMpin,
  getFarmerBasicDetails,
  getColdStorageDetailsForFarmer,
  getPaymentsForFarmer,
  deleteOtpVerification,
  insertOtpVerification,
  getOtpVerification,
  updateFarmerProfile,
  updateFarmerTarget,
  updateFarmerBasicDetails,
  verifyAndUpdateFarmerProfile
};
