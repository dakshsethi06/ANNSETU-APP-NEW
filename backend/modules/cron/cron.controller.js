const crypto = require('crypto');
const cronService = require('./cron.service');

async function processCropAging(req, res) {
  // Auth check (HTTP concern — stays in controller)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const cronSecret = process.env.CRON_SECRET || 'mandi_cron_secret';

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest();
    const secretHash = crypto.createHash('sha256').update(cronSecret).digest();
    if (!crypto.timingSafeEqual(tokenHash, secretHash)) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Timing check failed' });
  }

  // Delegate to service
  try {
    const result = await cronService.runCropAgingAlerts();
    return res.json({
      success: true,
      message: 'Crop aging alerts evaluation completed successfully.',
      alertsCreated: result.alertsCreated,
      date: result.date
    });
  } catch (error) {
    console.error('Crop aging cron error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error during crop aging alerts run' });
  }
}

module.exports = { processCropAging };
