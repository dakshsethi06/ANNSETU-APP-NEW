const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
let pool = null;

const hasValidUrl = databaseUrl && 
                     databaseUrl !== 'your_postgresql_connection_string_here' && 
                     !databaseUrl.includes('username:password');

if (hasValidUrl) {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      // Required for SSL connections to Supabase/managed cloud databases
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ PostgreSQL connection pool initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL connection pool:', error.message);
  }
} else {
  console.warn('⚠️ DATABASE_URL is not set or contains placeholder values. PostgreSQL database endpoints will return connection configuration errors.');
}

module.exports = pool;
