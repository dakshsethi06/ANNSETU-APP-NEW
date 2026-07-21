const cronRepository = require('./cron.repository');
const { createAppNotification } = require('../../shared/notifications/notifications');

/**
 * Run crop aging alerts evaluation.
 * Iterates all approved facilities, checks active lots for age thresholds,
 * and creates contextual notifications.
 */
async function runCropAgingAlerts() {
  const now = new Date();
  const alertDateIst = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
  const facilities = await cronRepository.getApprovedFacilities();
  let totalAlertsCreated = 0;

  for (const facility of facilities) {
    const activeLots = await cronRepository.getActiveLots(facility.id);

    for (const lot of activeLots) {
      const ageDays = Math.floor(Math.abs(now - new Date(lot.amadDate)) / (1000 * 60 * 60 * 24)) || 0;

      if (ageDays >= 61) {
        const type = ageDays >= 91 ? 'aging' : 'warning';
        const severityText = type === 'aging' ? 'Aging Alert' : 'Crop Warning';
        const icon = type === 'aging' ? 'alert-triangle' : 'info';
        const message = `Your stock ${lot.id.substring(0, 8).toUpperCase()} (${lot.crop}, ${lot.availablePackets} bags) has been stored for ${ageDays} days. Please arrange sale.`;

        const result = await createAppNotification({
          coldStorageId: facility.id, userId: lot.farmerId, lotId: lot.id,
          type, title: severityText, message, icon,
          actionUrl: '/inventory', alertDate: alertDateIst
        });
        if (result) totalAlertsCreated++;
      }
    }
  }

  return { alertsCreated: totalAlertsCreated, date: alertDateIst };
}

module.exports = { runCropAgingAlerts };
