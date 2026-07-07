import { BACKEND_URL } from '../../../core/network/config';

export async function fetchNotifications(farmerId) {
  try {
    const url = `${BACKEND_URL}/api/notifications?farmerId=${encodeURIComponent(farmerId)}&t=${Date.now()}`;
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch notifications');
    return data.notifications;
  } catch (err) {
    if (err.message.includes('Network request failed')) throw new Error('Could not connect to backend server.');
    throw err;
  }
}

export async function markNotificationRead(notificationId) {
  try {
    const url = `${BACKEND_URL}/api/notifications/${encodeURIComponent(notificationId)}/read`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to mark notification as read');
    return data.notification;
  } catch (err) {
    console.warn('Error marking notification as read:', err.message);
    return null;
  }
}
