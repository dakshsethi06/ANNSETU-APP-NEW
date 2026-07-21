const { Pool } = require('pg'); 
require('dotenv').config(); 
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
}); 

const setupDemoDevice = async () => {
  try {
    // 1. Insert Chamber
    await pool.query(`
      INSERT INTO "Chambers" (id, cold_storage_id, name)
      VALUES ('CH_DEMO', 'CS_123', 'Wokwi Demo Chamber')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Insert Device
    await pool.query(`
      INSERT INTO "Devices" (id, chamber_id, cold_storage_id, mac_address)
      VALUES ('DEV_WOKWI_DEMO', 'CH_DEMO', 'CS_123', 'WOKWI:MAC:01')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ Demo Chamber and Device created in Database!');
  } catch (err) {
    console.error('❌ DB Setup Error:', err);
  } finally {
    process.exit();
  }
};

setupDemoDevice();
