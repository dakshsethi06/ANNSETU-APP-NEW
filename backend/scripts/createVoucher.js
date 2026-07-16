const db = require('../config/database');

async function createVoucher() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
  Usage:
    node scripts/createVoucher.js <CODE> <AMOUNT> [EXPIRY_DATE] [USAGE_LIMIT]

  Arguments:
    CODE:         The voucher code (e.g. FLAT50, NEWYEAR)
    AMOUNT:       The discount amount (flat in Rs., e.g. 50, 100)
    EXPIRY_DATE:  (Optional) Expiry date YYYY-MM-DD. Defaults to 2027-01-01.
    USAGE_LIMIT:  (Optional) Number of times it can be used. Defaults to 100.

  Example:
    node scripts/createVoucher.js SAVE20 20 2026-12-31 50
`);
    process.exit(0);
  }

  const code = args[0].toUpperCase();
  const value = parseFloat(args[1]);
  if (isNaN(value) || value <= 0) {
    console.error('❌ Error: Amount must be a positive number.');
    process.exit(1);
  }

  const expiryStr = args[2] || '2027-01-01';
  const expiryDate = new Date(expiryStr);
  if (isNaN(expiryDate.getTime())) {
    console.error('❌ Error: Invalid expiry date format. Use YYYY-MM-DD.');
    process.exit(1);
  }

  const usageLimitVal = args[3] ? parseInt(args[3], 10) : 100;
  if (isNaN(usageLimitVal) || usageLimitVal <= 0) {
    console.error('❌ Error: Usage limit must be a positive integer.');
    process.exit(1);
  }

  try {
    await db.query(
      `INSERT INTO "PromoVoucher" (
        "code", "type", "value", "minOrderAmount", "usageLimit", "usageCount", "status", "expiryDate"
      ) VALUES ($1, 'FLAT', $2, 0.00, $3, 0, 'ACTIVE', $4)
      ON CONFLICT ("code") DO UPDATE 
      SET "value" = $2, "usageLimit" = $3, "status" = 'ACTIVE', "expiryDate" = $4`,
      [code, value, usageLimitVal, expiryDate]
    );
    console.log(`✅ Promo voucher code "${code}" created/updated successfully!`);
    console.log(`   - Value: Rs. ${value}`);
    console.log(`   - Limit: ${usageLimitVal} usages`);
    console.log(`   - Expiry: ${expiryDate.toDateString()}`);
  } catch (err) {
    console.error('❌ Failed to insert voucher:', err.message);
  } finally {
    await db.end();
  }
}

createVoucher();
