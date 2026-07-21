const { Pool } = require('pg');

const candidates = [
  'KWTi2AnXH%/-e68',
  'KWTi2AnXH/-e68',
  'KWTi2AnXH%-e68',
  'KWTi2AnXHe68',
  'KWTi2AnXH-e68',
  'KWTi2AnXH%25%2F-e68',
  'KWTi2AnXH%25-e68',
  'KWTi2AnXH%2F-e68',
  'KWTi2AnXH_e68',
  'KWTi2AnXH'
];

async function testAll() {
  for (const pw of candidates) {
    const pool = new Pool({
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.nrqjpjdnyxpstkmppwkm',
      password: pw,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 2000
    });

    try {
      const res = await pool.query('SELECT NOW()');
      console.log(`\n🎉🎉🎉 SUCCESS WITH PASSWORD: "${pw}"`);
      console.log('Query result:', res.rows[0]);
      await pool.end();
      return;
    } catch (err) {
      console.log(`Failed [${pw}]: ${err.message}`);
    } finally {
      await pool.end();
    }
  }
}

testAll();
