const db = require('../../config/database');

let initTablePromise = null;

function ensureTable() {
  if (!initTablePromise) {
    if (db && typeof db.query === 'function') {
      initTablePromise = db.query(`
        CREATE TABLE IF NOT EXISTS "KycVerification" (
          id SERIAL PRIMARY KEY,
          "farmerId" VARCHAR(255) NOT NULL,
          "verificationId" VARCHAR(255) UNIQUE NOT NULL,
          "referenceId" BIGINT,
          status VARCHAR(50) DEFAULT 'PENDING',
          "documentType" VARCHAR(50) DEFAULT 'AADHAAR',
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "Farmer" ADD COLUMN IF NOT EXISTS "accountNumber" VARCHAR(255);
        ALTER TABLE "Farmer" ADD COLUMN IF NOT EXISTS "ifscCode" VARCHAR(50);
        ALTER TABLE "Farmer" ADD COLUMN IF NOT EXISTS "accountHolderName" VARCHAR(255);
      `).catch(err => {
        console.error('❌ Failed to initialize KycVerification table:', err.message);
      });
    } else {
      initTablePromise = Promise.resolve();
    }
  }
  return initTablePromise;
}

async function createKycVerification(farmerId, verificationId, status = 'PENDING') {
  await ensureTable();
  if (!db) return { farmerId, verificationId, status };
  const res = await db.query(
    `INSERT INTO "KycVerification" ("farmerId", "verificationId", status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [farmerId, verificationId, status]
  );
  return res.rows[0];
}

async function getKycVerification(verificationId) {
  await ensureTable();
  if (!db) return null;
  const res = await db.query(
    `SELECT * FROM "KycVerification" WHERE "verificationId" = $1`,
    [verificationId]
  );
  return res.rows[0];
}

async function updateKycVerification(verificationId, updateData) {
  await ensureTable();
  if (!db) return null;
  const { referenceId, status } = updateData;
  const res = await db.query(
    `UPDATE "KycVerification"
     SET "referenceId" = COALESCE($1, "referenceId"),
         status = COALESCE($2, status),
         "updatedAt" = NOW()
     WHERE "verificationId" = $3
     RETURNING *`,
    [referenceId ? parseInt(referenceId, 10) : null, status, verificationId]
  );
  return res.rows[0];
}

async function updateFarmerAadhaar(farmerId, maskedAadhaar) {
  await ensureTable();
  if (!db) return null;
  // Update the Farmer table with the masked Aadhaar number
  const res = await db.query(
    `UPDATE "Farmer"
     SET "aadhaarNumber" = $1,
         "updatedAt" = NOW()
     WHERE ("id"::text = $2 OR "phone" = $2)
     RETURNING *`,
    [maskedAadhaar, farmerId]
  );
  return res.rows[0];
}

async function updateFarmerKycDetails(farmerId, maskedAadhaar, maskedPan) {
  await ensureTable();
  if (!db) return null;
  // Update the Farmer table with both masked Aadhaar and masked PAN
  const res = await db.query(
    `UPDATE "Farmer"
     SET "aadhaarNumber" = COALESCE($1, "aadhaarNumber"),
         "panNumber" = COALESCE($2, "panNumber"),
         "updatedAt" = NOW()
     WHERE ("id"::text = $3 OR "phone" = $3)
     RETURNING *`,
    [maskedAadhaar, maskedPan, farmerId]
  );
  return res.rows[0];
}

async function updateFarmerBankDetails(farmerId, bankAccount, ifsc, registeredName) {
  await ensureTable();
  if (!db) return null;
  const last4 = (bankAccount || '').slice(-4) || 'XXXX';
  const maskedAccount = `XXXX${last4}`;
  const res = await db.query(
    `UPDATE "Farmer"
     SET "accountNumber" = $1,
         "ifscCode" = $2,
         "accountHolderName" = $3,
         "updatedAt" = NOW()
     WHERE ("id"::text = $4 OR "phone" = $4)
     RETURNING *`,
    [maskedAccount, ifsc, registeredName, farmerId]
  );
  return res.rows[0];
}

module.exports = {
  createKycVerification,
  getKycVerification,
  updateKycVerification,
  updateFarmerAadhaar,
  updateFarmerKycDetails,
  updateFarmerBankDetails
};
