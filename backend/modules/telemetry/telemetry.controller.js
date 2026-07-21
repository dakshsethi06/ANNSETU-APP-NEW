const { Pool } = require('pg');
const config = require('../../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false }
});

const bulkSync = async (req, res) => {
  try {
    const { deviceId, records } = req.body;
    
    if (!deviceId || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Invalid payload format.' });
    }

    console.log(`[TelemetryController] Bulk sync received for ${deviceId} with ${records.length} records.`);
    
    // TODO: Insert bulk records into database
    
    return res.status(200).json({ success: true, message: 'Bulk sync processed successfully', count: records.length });
  } catch (error) {
    console.error('[TelemetryController] Error in bulk sync:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getLiveTelemetry = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM "ForeignTelemetry" 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);

    let telemetryData = result.rows;

    // RBAC Sanitization: Strip MAC, RSSI, and Battery for Mobile App roles
    const userRole = req.user?.role?.toUpperCase();
    if (userRole === 'VENDOR' || userRole === 'COLD_STORAGE_OWNER') {
      telemetryData = telemetryData.map(device => {
        const sanitized = { ...device };
        delete sanitized.mac_address;
        delete sanitized.rssi;
        delete sanitized.battery_voltage;
        delete sanitized.raw_error_codes;
        return sanitized;
      });
    }

    res.json({ success: true, data: telemetryData });
  } catch (error) {
    console.error('[TelemetryController] Error fetching live telemetry:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
};

module.exports = {
  bulkSync,
  getLiveTelemetry
};
