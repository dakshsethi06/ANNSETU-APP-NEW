const pool = require('../../config/database');
const { dispatchAdminAlert, dispatchMobileAlert } = require('./notification.dispatcher');

// Hardcoded thresholds (TODO: Move to ChamberSettings table)
const THRESHOLDS = {
  HIGH_TEMP: 8.0, // °C
  LOW_TEMP: 2.0,  // °C
};

const createAlertRecord = async (alertData) => {
  if (!pool) return;
  const alertId = 'ALT_' + Date.now();
  const query = `
    INSERT INTO "Alerts" (
      "id", "chamber_id", "device_id", "alert_type", "severity", "value"
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [
    alertId, 
    alertData.chamber_id, 
    alertData.device_id, 
    alertData.type, 
    alertData.severity, 
    alertData.details
  ];
  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error('[AlertEngine] DB Insert Error:', err.message);
  }
};

const triggerAlert = async (device_id, chamber_id, type, severity, current_value, details) => {
  const alertPayload = {
    device_id,
    chamber_id,
    type,
    severity,
    current_value,
    details
  };

  // 1. Save to DB
  await createAlertRecord(alertPayload);

  // 2. Dispatch to Admin (Technical)
  await dispatchAdminAlert(alertPayload);

  // 3. Dispatch to Farmer/Vendor (Business language)
  // Look up chamber name (mocked for now)
  const chamberName = chamber_id ? `Chamber ${chamber_id}` : 'Cold Storage Area';
  await dispatchMobileAlert(alertPayload, chamberName);
};

const evaluateTelemetry = async (clientId, data) => {
  const { device_id, chamber_id, temperature, humidity } = data;

  // 1. Sensor Failure Check
  if (temperature === null || temperature === undefined || Number.isNaN(temperature)) {
    await triggerAlert(
      device_id, 
      chamber_id, 
      'SENSOR_FAILURE', 
      'HIGH', 
      null, 
      `Sensor returned invalid temperature: ${temperature}`
    );
    return;
  }

  // 2. Temperature Threshold Checks
  if (temperature > THRESHOLDS.HIGH_TEMP) {
    await triggerAlert(
      device_id, 
      chamber_id, 
      'HIGH_TEMP', 
      'MEDIUM', 
      temperature, 
      `Temperature ${temperature}°C exceeds HIGH threshold of ${THRESHOLDS.HIGH_TEMP}°C`
    );
  } else if (temperature < THRESHOLDS.LOW_TEMP) {
    await triggerAlert(
      device_id, 
      chamber_id, 
      'LOW_TEMP', 
      'MEDIUM', 
      temperature, 
      `Temperature ${temperature}°C below LOW threshold of ${THRESHOLDS.LOW_TEMP}°C`
    );
  }
};

module.exports = {
  evaluateTelemetry,
  triggerAlert
};
