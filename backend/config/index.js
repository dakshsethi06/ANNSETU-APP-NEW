require('dotenv').config();

const config = {
  port: Number.parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  mandiApiKey: process.env.MANDI_API_KEY || '',
  mandiApiUrl: process.env.MANDI_API_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
  cronSecret: process.env.CRON_SECRET || 'mandi_cron_secret',
  supabaseUrl: process.env.SUPABASE_URL || 'https://tbrvuyzjzruysxamiuaz.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicnZ1eXpqenJ1eXN4YW1pdWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODczNTAsImV4cCI6MjA5Nzk2MzM1MH0.vs9F0doRCPhI6rPGfURJYak05FbFMhZ1jhmN64m7NXY',
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
