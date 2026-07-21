/**
 * Notification Dispatcher
 * Formats and routes alerts to different roles via different channels.
 */

const dispatchAdminAlert = async (alert) => {
  // Web Admin Panel (Technician / Admin — Technical Detail)
  // The DB record in "Alerts" handles the persistent state in the dashboard.
  // This function pushes the live technical notification.
  const payload = {
    timestamp: new Date().toISOString(),
    device_id: alert.device_id,
    chamber_id: alert.chamber_id,
    alert_type: alert.type,
    severity: alert.severity,
    technical_details: alert.details
  };
  
  console.log('----------------------------------------------------');
  console.log(`[Notification: ADMIN] 🔴 SEVERITY: ${payload.severity}`);
  console.log(`RAW PAYLOAD: ${JSON.stringify(payload)}`);
  console.log('----------------------------------------------------');

  // TODO: Push via WebSockets/Socket.io to Admin Panel
};

const dispatchMobileAlert = async (alert, chamberName = 'Unknown Chamber') => {
  // Mobile App (Farmer / Vendor — Plain Language)
  let plainMessage = '';
  
  switch (alert.type) {
    case 'HIGH_TEMP':
      plainMessage = `${chamberName} is too warm (${alert.current_value}°C). Your produce is at risk.`;
      break;
    case 'LOW_TEMP':
      plainMessage = `${chamberName} is too cold (${alert.current_value}°C). Frost damage risk.`;
      break;
    case 'SENSOR_FAILURE':
      plainMessage = `${chamberName} sensor has failed. Contact your cold storage manager for repair.`;
      break;
    case 'COMM_FAILURE':
      plainMessage = `${chamberName} has gone offline. Data is not updating.`;
      break;
    default:
      plainMessage = `Attention required in ${chamberName}.`;
  }

  console.log('----------------------------------------------------');
  console.log(`[Notification: FARMER APP] 📱 PUSH NOTIFICATION`);
  console.log(`Message: "${plainMessage}"`);
  console.log('----------------------------------------------------');

  // TODO: Integrate actual Twilio SMS / Firebase FCM here
};

module.exports = {
  dispatchAdminAlert,
  dispatchMobileAlert
};
