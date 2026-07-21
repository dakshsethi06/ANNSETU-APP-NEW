const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres.wkqcwjapitgtgysjjeab:KWTi2AnXH%25%2F-e68@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' });
c.connect()
  .then(() => c.query('SELECT phone, mpin FROM "ColdStorageOnboarding" LIMIT 5'))
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); })
  .catch(console.error);
