const db = require('../../../config/database');

async function getFarmerLedger(id) {
  // Check if this ID belongs to a Cold Storage
  const csCheck = await db.query('SELECT id, "displayName" FROM "ColdStorageOnboarding" WHERE id = $1', [id]);
  const isCS = csCheck.rows.length > 0;

  if (isCS) {
    // 1. Fetch all Nikasi bills for this Cold Storage
    const nikasiRes = await db.query(`
      SELECT 
        nt.id,
        f.name || ' - Rent Bill - Nikasi #' || nt."nikasiNumber" AS title,
        nt."createdAt" AS date,
        -nt."totalBillAmount" AS amount,
        nt."nikasiNumber" AS "billNumber"
      FROM "NikasiTransaction" nt
      JOIN "Farmer" f ON f.id = nt."farmerId"
      WHERE nt."coldStorageId" = $1
    `, [id]);

    // 2. Fetch all Manual Billing entries for this Cold Storage
    const billingRes = await db.query(`
      SELECT 
        be.id,
        f.name || ' - ' || be."chargeType" || ' - ' || be."invoiceNumber" AS title,
        be."createdAt" AS date,
        -be.amount AS amount,
        be."invoiceNumber" AS "billNumber"
      FROM "BillingEntry" be
      JOIN "Farmer" f ON f.id = be."farmerId"
      WHERE f."coldStorageId" = $1
    `, [id]);

    // 3. Fetch all Payments for this Cold Storage
    const paymentRes = await db.query(`
      SELECT 
        p.id,
        f.name || ' - Payment Received (' || p."paymentMode" || ')' || COALESCE(' - Ref: ' || p.reference, '') AS title,
        p."createdAt" AS date,
        p.amount AS amount,
        p."paymentMode",
        p.reference,
        p."bankName",
        p."bankTransactionId",
        COALESCE(p."receiptUrl", p.note) AS note,
        NULL AS "billNumber"
      FROM "Payment" p
      JOIN "Farmer" f ON f.id = p."farmerId"
      WHERE p."coldStorageId" = $1 AND p."status" IN ('APPROVED', 'PAID')
    `, [id]);

    const entries = [
      ...nikasiRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      ...billingRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      ...paymentRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) }))
    ];

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const entriesWithRunning = entries.map(entry => {
      // Standardized Running Balance Direction:
      // Positive values represent Outstanding Farmer Dues (asset/receivable for Cold Storage).
      // Charges/Bills (negative in entry.amount) increase outstanding dues.
      // Payments (positive in entry.amount) decrease outstanding dues.
      runningBalance += (-entry.amount); 
      return {
        ...entry,
        balance: runningBalance
      };
    });

    return entriesWithRunning.reverse();
  }

  // Otherwise, standard farmer logic:
  // Fetch opening balance of the farmer
  const farmerRes = await db.query('SELECT "openingBalance" FROM "Farmer" WHERE id = $1', [id]);
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
  `, [id]);

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
  `, [id]);

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
      COALESCE("receiptUrl", note) AS "note",
      NULL AS "billNumber"
    FROM "Payment"
    WHERE "farmerId" = $1 AND "status" IN ('APPROVED', 'PAID')
  `, [id]);

  const entries = [
    ...nikasiRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    ...billingRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    ...paymentRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) }))
  ];

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = openingBalance;
  const entriesWithRunning = entries.map(entry => {
    // Standardized Running Balance Direction:
    // Positive values represent Outstanding Farmer Dues (liability/payable for Farmer).
    // Charges/Bills (negative in entry.amount) increase outstanding dues.
    // Payments (positive in entry.amount) decrease outstanding dues.
    runningBalance += (-entry.amount); 
    return {
      ...entry,
      balance: runningBalance
    };
  });

  return entriesWithRunning.reverse();
}

module.exports = { getFarmerLedger };
