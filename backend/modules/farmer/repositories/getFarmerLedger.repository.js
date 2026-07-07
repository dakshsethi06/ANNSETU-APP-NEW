const db = require('../../../config/database');

async function getFarmerLedger(farmerId) {
  // Fetch opening balance of the farmer
  const farmerRes = await db.query('SELECT "openingBalance" FROM "Farmer" WHERE id = $1', [farmerId]);
  const openingBalance = farmerRes.rows.length > 0 ? parseFloat(farmerRes.rows[0].openingBalance || 0) : 0;

  // 1. Fetch Nikasi bills
  const nikasiRes = await db.query(`
    SELECT 
      id,
      'Rent Bill - Nikasi #' || "nikasiNumber" AS title,
      "createdAt" AS date,
      -"totalBillAmount" AS amount,
      "nikasiNumber" AS "billNumber"
    FROM "NikasiTransaction"
    WHERE "farmerId" = $1
  `, [farmerId]);

  // 2. Fetch Manual Billing entries
  const billingRes = await db.query(`
    SELECT 
      id,
      "chargeType" || ' - ' || "invoiceNumber" AS title,
      "createdAt" AS date,
      -amount AS amount,
      "invoiceNumber" AS "billNumber"
    FROM "BillingEntry"
    WHERE "farmerId" = $1
  `, [farmerId]);

  // 3. Fetch Payments
  const paymentRes = await db.query(`
    SELECT 
      id,
      'Payment Received (' || "paymentMode" || ')' || COALESCE(' - Ref: ' || reference, '') AS title,
      "createdAt" AS date,
      amount AS amount,
      "paymentMode",
      reference,
      "bankName",
      "bankTransactionId",
      "note",
      NULL AS "billNumber"
    FROM "Payment"
    WHERE "farmerId" = $1 AND "status" IN ('APPROVED', 'PAID')
  `, [farmerId]);

  const entries = [
    ...nikasiRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    ...billingRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    ...paymentRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) }))
  ];

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = openingBalance;
  const entriesWithRunning = entries.map(entry => {
    runningBalance += (-entry.amount); 
    return {
      ...entry,
      balance: runningBalance
    };
  });

  return entriesWithRunning.reverse();
}

module.exports = { getFarmerLedger };
