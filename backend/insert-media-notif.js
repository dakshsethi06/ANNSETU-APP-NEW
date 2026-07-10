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
  
  await client.query(`
    INSERT INTO "AppNotification" 
    ("id", "userId", "coldStorageId", "title", "message", "type", "isRead", "createdAt", "updatedAt", "actionUrl") 
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
  `, [
    'test-media-' + Date.now(), 
    user.id,
    user.coldStorageId,
    'Media Test', 
    'Click this to view media', 
    'GLOBAL_BROADCAST', 
    false, 
    'https://picsum.photos/400/600'
  ]);
  
  console.log('Notification with media inserted for user', user.id);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
