export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.189.73.163:3001';
export const USE_BACKEND = true;

export const API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

export const formatImageUrl = (url) => {
  if (!url) return url;
  if (url.includes('localhost')) {
    // Extract IP address from BACKEND_URL (e.g., "http://10.189.73.163:3001" -> "10.189.73.163")
    const match = BACKEND_URL.match(/http:\/\/([^:]+)/);
    const ip = match ? match[1] : '10.189.73.163';
    return url.replace('localhost', ip);
  }
  return url;
};
