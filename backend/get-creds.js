const { Client } = require('pg');

const getCredentials = async () => {
  const appClient = new Client({
    connectionString: 'postgresql://postgres.wkqcwjapitgtgysjjeab:KWTi2AnXH%25%2F-e68@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
  });
  await appClient.connect();
  
  const fRes = await appClient.query('SELECT phone, mpin FROM "Farmer" WHERE phone LIKE \'%9855462104%\' LIMIT 1');
  if (fRes.rows.length > 0) {
    console.log('FARMER:', fRes.rows[0]);
  } else {
    console.log('Not found in Farmer');
  }

  const cRes = await appClient.query('SELECT phone, mpin FROM "ColdStorageOnboarding" WHERE phone LIKE \'%9855462104%\' LIMIT 1');
  if (cRes.rows.length > 0) {
    console.log('COLD STORAGE:', cRes.rows[0]);
  } else {
    console.log('Not found in ColdStorageOnboarding');
  }
  
  await appClient.end();
};

getCredentials().catch(console.error);
