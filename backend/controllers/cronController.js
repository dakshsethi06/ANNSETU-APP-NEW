const crypto = require('crypto');
const cronRepository = require('../repositories/cronRepository');
const { createAppNotification } = require('../lib/notifications');

async function processCropAging(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
  
  const token = authHeader.split(' ')[1];
  const cronSecret = process.env.CRON_SECRET || 'mandi_cron_secret';
  
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest();
    const secretHash = crypto.createHash('sha256').update(cronSecret).digest();
    if (!crypto.timingSafeEqual(tokenHash, secretHash)) return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  } catch (err) { return res.status(401).json({ success: false, error: 'Unauthorized: Timing check failed' }); }

  try {
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
            coldStorageId: facility.id, userId: lot.farmerId, lotId: lot.id, type, title: severityText,
            message, icon, actionUrl: `/inventory`, alertDate: alertDateIst
          });
          if (result) totalAlertsCreated++;
        }
      }
    }
    return res.json({ success: true, message: 'Crop aging alerts evaluation completed successfully.', alertsCreated: totalAlertsCreated, date: alertDateIst });
  } catch (error) {
    console.error('Crop aging cron error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error during crop aging alerts run' });
  }
}

module.exports = { processCropAging };
