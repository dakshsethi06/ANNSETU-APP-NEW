export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.158.24:3001';
export const USE_BACKEND = true;

export const API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
export const API_KEY = '579b464db66ec23bdd0000011eca722018e9429560514de390d5bb1e';

// WeatherAPI.com API details
export const WEATHER_API_URL = 'https://api.weatherapi.com/v1/forecast.json';
export const WEATHER_API_KEY = 'cc98b5f11d594fa893f52703261806'; // User's WeatherAPI.com API Key

// Zoho Desk Portal Link
export const ZOHO_DESK_PORTAL_LINK = process.env.EXPO_PUBLIC_ZOHO_DESK_PORTAL_LINK || 'https://annsetu.zohodesk.in/portal/';

// Azure Translator credentials
export const AZURE_TRANSLATOR_KEY = '16vD2QiaclSgpdd4ObTxhoyvEg7z73yCQH0ezbLqhlWdBMWTth1RJQQJ99CGACGhslBXJ3w3AAAbACOGJLLo';
export const AZURE_TRANSLATOR_REGION = 'centralindia';

export const formatImageUrl = (url) => {
  if (!url) return url;
  if (url.includes('localhost')) {
    // Extract IP address from BACKEND_URL (e.g., "http://192.168.158.24:3001" -> "192.168.158.24")
    const match = BACKEND_URL.match(/http:\/\/([^:]+)/);
    const ip = match ? match[1] : '192.168.158.24';
    return url.replace('localhost', ip);
  }
  return url;
};
