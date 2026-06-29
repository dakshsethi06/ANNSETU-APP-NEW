import { BACKEND_URL } from './config';

export async function fetchNotifications(farmerId) {
  try {
    const url = `${BACKEND_URL}/api/notifications?farmerId=${encodeURIComponent(farmerId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch notifications');
    return data.notifications;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}
