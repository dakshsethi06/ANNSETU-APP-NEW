const db = require('../config/database');

async function inspect() {
  const res = await db.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('PromoVoucher', 'PromoVoucherLedger', 'IdempotencyRecord', 'Payment', 'Voucher')
    ORDER BY table_name, ordinal_position;
  `);
  console.log(res.rows);
  await db.end();
}
inspect();
