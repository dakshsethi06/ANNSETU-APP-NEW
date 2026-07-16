const db = require('../config/database');

async function runMigration() {
  if (!db) {
    console.error('❌ Database pool not initialized. Check your environment variables.');
    process.exit(1);
  }

  const client = await db.connect();
  try {
    console.log('🔄 Starting migration to create promo voucher tables...');
    await client.query('BEGIN');

    // 1. Create PromoVoucher Table
    console.log('Creating "PromoVoucher" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PromoVoucher" (
        "code" VARCHAR(255) PRIMARY KEY,
        "type" VARCHAR(50) NOT NULL,
        "value" DECIMAL(10, 2) NOT NULL,
        "minOrderAmount" DECIMAL(10, 2) DEFAULT 0.00,
        "maxDiscountAmount" DECIMAL(10, 2) NULL,
        "usageLimit" INTEGER DEFAULT 1,
        "usageCount" INTEGER DEFAULT 0,
        "status" VARCHAR(50) DEFAULT 'ACTIVE',
        "expiryDate" TIMESTAMP NOT NULL,
        "coldStorageId" VARCHAR(255) NULL,
        "farmerId" VARCHAR(255) NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Create PromoVoucherLedger Table
    console.log('Creating "PromoVoucherLedger" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PromoVoucherLedger" (
        "id" VARCHAR(255) PRIMARY KEY,
        "farmerId" VARCHAR(255) NOT NULL,
        "voucherCode" VARCHAR(255) NOT NULL,
        "discountApplied" DECIMAL(10, 2) NOT NULL,
        "orderId" VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_farmer FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE,
        CONSTRAINT fk_voucher FOREIGN KEY ("voucherCode") REFERENCES "PromoVoucher"("code") ON DELETE CASCADE
      )
    `);

    // 3. Create IdempotencyRecord Table
    console.log('Creating "IdempotencyRecord" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
        "key" VARCHAR(255) PRIMARY KEY,
        "response" JSONB NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    // 4. Alter Payment Table
    console.log('Adding columns to "Payment" table...');
    await client.query(`
      ALTER TABLE "Payment" 
      ADD COLUMN IF NOT EXISTS "voucherCode" VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10, 2) DEFAULT 0.00
    `);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

runMigration();
