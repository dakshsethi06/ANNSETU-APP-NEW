const db = require('../config/database');

async function insertVoucher() {
  const code = 'TEST10';
  const type = 'FLAT';
  const value = 10.00;
  const expiryDate = new Date('2027-01-01');

  try {
    await db.query(
      `INSERT INTO "PromoVoucher" (
        "code", "type", "value", "minOrderAmount", "usageLimit", "usageCount", "status", "expiryDate"
      ) VALUES ($1, $2, $3, 0.00, 100, 0, 'ACTIVE', $4)
      ON CONFLICT ("code") DO UPDATE 
      SET "value" = $3, "status" = 'ACTIVE', "expiryDate" = $4`,
      [code, type, value, expiryDate]
    );
    console.log('✅ Test voucher code TEST10 created successfully!');
  } catch (err) {
    console.error('❌ Failed to insert test voucher:', err.message);
  } finally {
    await db.end();
  }
}

insertVoucher();
