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
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true
    });
    
    pool.on('error', (err) => {
      console.error('⚠️ Unexpected pg pool error:', err.message);
    });

    // Enhance pool.query with single automatic retry for transient PgBouncer / network connection drops
    const originalQuery = pool.query.bind(pool);
    pool.query = async (text, params) => {
      try {
        return await originalQuery(text, params);
      } catch (err) {
        if (err.message && (err.message.includes('Connection terminated') || err.message.includes('closed') || err.message.includes('ending'))) {
          console.warn('⚠️ Retrying database query after connection drop...');
          return await originalQuery(text, params);
        }
        throw err;
      }
    };

    console.log('✅ PostgreSQL connection pool initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL connection pool:', error.message);
  }
} else {
  console.warn('⚠️ DATABASE_URL is not set or contains placeholder values. PostgreSQL database endpoints will return connection configuration errors.');
}

module.exports = pool;
