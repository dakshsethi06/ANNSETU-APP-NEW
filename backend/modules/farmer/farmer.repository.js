const db = require('../../config/database');

async function getFarmersData(state, serial_number) {
  let sql = `
    SELECT 
      f.id AS "serial_number", f.name, f.state, f."primaryCrop" AS commodity, 
      f."fatherName", f.phone, f.email, f.village, f.district, f.tehsil,
      COALESCE(SUM(nt."balanceDueAmount"), 0) AS "pendingRent"
      f."fatherName", f.phone, f.village, f.district, f.tehsil,
      (
        COALESCE(f."openingBalance", 0)
        + COALESCE((SELECT SUM("totalBillAmount") FROM "NikasiTransaction" WHERE "farmerId" = f.id), 0)
        + COALESCE((SELECT SUM("amount") FROM "BillingEntry" WHERE "farmerId" = f.id), 0)
        - COALESCE((SELECT SUM("amount") FROM "Payment" WHERE "farmerId" = f.id AND "status" IN ('APPROVED', 'PAID')), 0)
      ) AS "pendingRent"
    FROM "Farmer" f
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (state) {
    sql += ` AND f.state ILIKE $${paramIndex}`;
    params.push(state);
    paramIndex++;
  }
  if (serial_number) {
    sql += ` AND f.id = $${paramIndex}`;
    params.push(serial_number);
    paramIndex++;
  }

  sql += ` GROUP BY f.id, f.name, f.state, f."primaryCrop", f."fatherName", f.phone, f.email, f.village, f.district, f.tehsil`;

  const result = await db.query(sql, params);
  return result.rows;
}

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

async function getFarmerByPhone(phone) {
  const cleanPhone = phone.replace('+91', '').trim();
  const result = await db.query(
    `SELECT * FROM "Farmer" 
     WHERE "phone" = $1 
        OR "phone" = $2 
        OR "id" = $1 
        OR "id" = $2 
     LIMIT 1`,
    [cleanPhone, '+91' + cleanPhone]
  );
  return result.rows[0];
}

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
      -"totalBillAmount" AS amount
    FROM "NikasiTransaction"
    WHERE "farmerId" = $1
  `, [farmerId]);

  // 2. Fetch Manual Billing entries
  const billingRes = await db.query(`
    SELECT 
      id,
      "chargeType" || ' - ' || "invoiceNumber" AS title,
      "createdAt" AS date,
      -amount AS amount
    FROM "BillingEntry"
    WHERE "farmerId" = $1
  `, [farmerId]);

  // 3. Fetch Payments (Both approved manual and paid online payments should affect the ledger)
  const paymentRes = await db.query(`
    SELECT 
      id,
      'Payment Received (' || "paymentMode" || ')' || COALESCE(' - Ref: ' || reference, '') AS title,
      "createdAt" AS date,
      amount AS amount
    FROM "Payment"
    WHERE "farmerId" = $1 AND "status" IN ('APPROVED', 'PAID')
  `, [farmerId]);

  // Combine and sort by date descending
  const entries = [
    ...nikasiRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    ...billingRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    ...paymentRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) }))
  ];

  // Sort ascending by date to compute rolling balance
  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = openingBalance;
  const entriesWithRunning = entries.map(entry => {
    // If it's a charge (negative amount), it increases the dues (balance)
    // If it's a payment (positive amount), it decreases the dues
    runningBalance += (-entry.amount);
    return {
      ...entry,
      balance: runningBalance
    };
  });

  // Return descending (most recent first)
  return entriesWithRunning.reverse();
}

module.exports = { getFarmersData, createFarmerRecord, getFarmerLedger, getFarmerByPhone };
