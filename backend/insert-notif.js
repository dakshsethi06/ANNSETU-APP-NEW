const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.wkqcwjapitgtgysjjeab:KWTi2AnXH%25%2F-e68@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
});

client.connect().then(async () => {
  const res = await client.query('SELECT u.id, u.phone, (SELECT id FROM "ColdStorageOnboarding" LIMIT 1) as "coldStorageId" FROM "User" u WHERE u.phone = \'9855462104\' LIMIT 1');
  if (!res.rows.length) {
    console.log('User not found');
    process.exit(1);
  }
  const user = res.rows[0];
  const userId = user.id;
  const coldStorageId = user.coldStorageId;
  
  console.log('User phone:', user.phone, 'ColdStorageId:', coldStorageId);

  await client.query(`
    INSERT INTO "AppNotification" 
    ("id", "userId", "coldStorageId", "title", "message", "type", "isRead", "createdAt", "updatedAt", "actionUrl") 
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
  `, [
    'test-notif-' + Date.now(), 
    userId,
    coldStorageId,
    'DOM Test Notification', 
    'This is a test notification for the dustbin feature.', 
    'GLOBAL_BROADCAST', 
    false, 
    'http://localhost:3002/uploads/test.png'
  ]);
  
  console.log('Notification inserted for user', userId);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
