require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  mandiApiKey: process.env.MANDI_API_KEY || '',
  mandiApiUrl: process.env.MANDI_API_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
  cronSecret: process.env.CRON_SECRET || 'mandi_cron_secret',
};

// Validate required config at startup
const warnings = [];
if (!config.databaseUrl || config.databaseUrl.includes('username:password')) {
  warnings.push('DATABASE_URL is not set or contains placeholder values. Database endpoints will fail.');
}

if (warnings.length > 0) {
  warnings.forEach((w) => console.warn(`⚠️  Config Warning: ${w}`));
}

module.exports = Object.freeze(config);
