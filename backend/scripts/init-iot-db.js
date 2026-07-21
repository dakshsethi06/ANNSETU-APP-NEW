const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createIotTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[DB] Connected. Creating IoT Tables...');

    // 1. Chambers Table
    // Links to ColdStorageOnboarding (Assuming it exists, else we omit FK constraint or use string)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Chambers" (
        "id" VARCHAR(255) PRIMARY KEY,
        "cold_storage_id" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "status" VARCHAR(50) DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] "Chambers" table created.');

    // 2. Devices Table
    // The barcode value and URL are included per MD 2.4
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Devices" (
        "id" VARCHAR(255) PRIMARY KEY,
        "chamber_id" VARCHAR(255) REFERENCES "Chambers"("id") ON DELETE SET NULL,
        "cold_storage_id" VARCHAR(255) NOT NULL,
        "mac_address" VARCHAR(255) UNIQUE NOT NULL,
        "serial_number" VARCHAR(255),
        "firmware_version" VARCHAR(50),
        "hardware_version" VARCHAR(50),
        "device_status" VARCHAR(50) DEFAULT 'OFFLINE',
        "barcode_value" VARCHAR(255),
        "barcode_image_url" TEXT,
        "installation_date" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "last_communication" TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('[DB] "Devices" table created.');

    // 3. TelemetryLogs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TelemetryLogs" (
        "id" BIGSERIAL PRIMARY KEY,
        "device_id" VARCHAR(255) REFERENCES "Devices"("id") ON DELETE CASCADE,
        "temperature" DECIMAL(5,2),
        "humidity" DECIMAL(5,2),
        "battery_voltage" DECIMAL(5,2),
        "rssi" INTEGER,
        "packet_loss_percent" DECIMAL(5,2),
        "recorded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for TelemetryLogs
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_telemetry_device_id" ON "TelemetryLogs"("device_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_telemetry_recorded_at" ON "TelemetryLogs"("recorded_at");`);
    console.log('[DB] "TelemetryLogs" table and indexes created.');

    // 4. Alerts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Alerts" (
        "id" VARCHAR(255) PRIMARY KEY,
        "device_id" VARCHAR(255) REFERENCES "Devices"("id") ON DELETE CASCADE,
        "chamber_id" VARCHAR(255) REFERENCES "Chambers"("id") ON DELETE CASCADE,
        "alert_type" VARCHAR(100) NOT NULL,
        "severity" VARCHAR(50) NOT NULL,
        "value" TEXT,
        "is_acknowledged" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] "Alerts" table created.');

    // 5. OtaTasks Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "OtaTasks" (
        "id" VARCHAR(255) PRIMARY KEY,
        "target_device_id" VARCHAR(255) REFERENCES "Devices"("id") ON DELETE CASCADE,
        "target_firmware_version" VARCHAR(50) NOT NULL,
        "status" VARCHAR(50) DEFAULT 'PENDING',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] "OtaTasks" table created.');

    await client.query('COMMIT');
    console.log('✅ All IoT tables created successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating IoT tables:', err);
  } finally {
    client.release();
    pool.end();
  }
};

createIotTables();
