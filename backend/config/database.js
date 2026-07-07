const { Pool } = require('pg');
const config = require('./index');

let pool = null;

const hasValidUrl = config.databaseUrl && 
                     config.databaseUrl !== 'your_postgresql_connection_string_here' && 
                     !config.databaseUrl.includes('username:password');

if (hasValidUrl) {
  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
    console.log('✅ PostgreSQL connection pool initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL connection pool:', error.message);
  }
} else {
  console.warn('⚠️ DATABASE_URL is not set or contains placeholder values. PostgreSQL database endpoints will return connection configuration errors.');
}

module.exports = pool;
