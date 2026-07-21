const pool = require('../../config/database');
const { triggerAlert } = require('./alert.engine');

// Run every 5 minutes
const WATCHDOG_INTERVAL_MS = 5 * 60 * 1000;
// Considered offline if no communication for 15 minutes
const OFFLINE_THRESHOLD_MINUTES = 15;

const startWatchdog = () => {
  console.log(`[Watchdog] Started. Checking for offline devices every ${WATCHDOG_INTERVAL_MS / 60000} minutes.`);
  
  setInterval(async () => {
    if (!pool) return;
    try {
      console.log('[Watchdog] Running communication check...');
      
      // Find devices whose last_communication is older than OFFLINE_THRESHOLD_MINUTES
      // and whose status is 'ONLINE' (or we just want to flag them as OFFLINE)
      const query = `
        SELECT id, chamber_id, device_status, last_communication
        FROM "Devices"
        WHERE last_communication < NOW() - INTERVAL '${OFFLINE_THRESHOLD_MINUTES} minutes'
          AND device_status = 'ONLINE'
      `;
      const res = await pool.query(query);
      
      const offlineDevices = res.rows;
      if (offlineDevices.length > 0) {
        console.log(`[Watchdog] Found ${offlineDevices.length} offline devices.`);
        
        for (const device of offlineDevices) {
          // 1. Update status to OFFLINE
          await pool.query(`UPDATE "Devices" SET device_status = 'OFFLINE' WHERE id = $1`, [device.id]);
          
          // 2. Trigger Communication Failure Alert
          await triggerAlert(
            device.id,
            device.chamber_id,
            'COMM_FAILURE',
            'HIGH',
            null,
            `Device has not communicated for over ${OFFLINE_THRESHOLD_MINUTES} minutes.`
          );
        }
      }
    } catch (error) {
      console.error('[Watchdog] Error running check:', error.message);
    }
  }, WATCHDOG_INTERVAL_MS);
};

module.exports = {
  startWatchdog
};
