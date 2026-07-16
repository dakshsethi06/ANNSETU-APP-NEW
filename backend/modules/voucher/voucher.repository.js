const db = require('../../config/database');

async function getVoucherByCode(code) {
  const res = await db.query('SELECT * FROM "PromoVoucher" WHERE "code" = $1', [code]);
  return res.rows[0] || null;
}

async function getVoucherByCodeForUpdate(code, client) {
  const executor = client || db;
  const res = await executor.query('SELECT * FROM "PromoVoucher" WHERE "code" = $1 FOR UPDATE', [code]);
  return res.rows[0] || null;
}

async function incrementVoucherUsage(code, client) {
  const executor = client || db;
  const res = await executor.query(
    `UPDATE "PromoVoucher" 
     SET "usageCount" = "usageCount" + 1, 
         "status" = CASE WHEN "usageCount" + 1 >= "usageLimit" THEN 'EXHAUSTED' ELSE "status" END, 
         "updatedAt" = NOW() 
     WHERE "code" = $1 
     RETURNING *`,
    [code]
  );
  return res.rows[0];
}

async function insertVoucherLedger(ledgerData, client) {
  const executor = client || db;
  const id = 'vl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const { farmerId, voucherCode, discountApplied, orderId } = ledgerData;
  const res = await executor.query(
    `INSERT INTO "PromoVoucherLedger" ("id", "farmerId", "voucherCode", "discountApplied", "orderId", "createdAt")
     VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
    [id, farmerId, voucherCode, discountApplied, orderId]
  );
  return res.rows[0];
}

async function createVoucher(voucherData) {
  const { 
    code, type, value, minOrderAmount, maxDiscountAmount, 
    usageLimit, status, expiryDate, coldStorageId, farmerId 
  } = voucherData;
  const res = await db.query(
    `INSERT INTO "PromoVoucher" (
      "code", "type", "value", "minOrderAmount", "maxDiscountAmount", 
      "usageLimit", "usageCount", "status", "expiryDate", "coldStorageId", "farmerId", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, NOW(), NOW())
    RETURNING *`,
    [
      code, type, value, minOrderAmount || 0, maxDiscountAmount || null, 
      usageLimit || 1, status || 'ACTIVE', expiryDate, coldStorageId || null, farmerId || null
    ]
  );
  return res.rows[0];
}

module.exports = {
  getVoucherByCode,
  getVoucherByCodeForUpdate,
  incrementVoucherUsage,
  insertVoucherLedger,
  createVoucher
};
