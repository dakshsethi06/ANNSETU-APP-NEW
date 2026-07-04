const db = require('./db');
async function run() {
  try {
    const resPayments = await db.query('SELECT * FROM "Payment" ORDER BY "createdAt" DESC LIMIT 5');
    console.log('RECENT PAYMENTS:', resPayments.rows);
    
    const resNotifs = await db.query('SELECT * FROM "AppNotification" ORDER BY "createdAt" DESC LIMIT 5');
    console.log('RECENT NOTIFICATIONS:', resNotifs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
