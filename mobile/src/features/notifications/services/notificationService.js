import { BACKEND_URL } from '../../../core/network/config';
import { supabase } from '../../../core/network/supabase';

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

export async function deleteNotification(notificationId) {
  try {
    const url = `${BACKEND_URL}/api/notifications/${encodeURIComponent(notificationId)}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete notification');
    return true;
  } catch (err) {
    console.warn('Error deleting notification:', err.message);
    return false;
  }
}

/**
 * Subscribe to real-time notification changes (INSERT, UPDATE, DELETE) for a specific user.
 */
export function subscribeToNotifications(userId, onNotificationReceived, onNotificationUpdated, onNotificationDeleted) {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`app-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'AppNotification',
        filter: `userId=eq.${userId}`
      },
      (payload) => {
        console.log(`[Realtime Notification] Event: ${payload.eventType}`, payload);
        if (payload.eventType === 'INSERT') {
          if (onNotificationReceived) onNotificationReceived(payload.new);
        } else if (payload.eventType === 'UPDATE') {
          if (onNotificationUpdated) onNotificationUpdated(payload.new);
        } else if (payload.eventType === 'DELETE') {
          if (onNotificationDeleted) onNotificationDeleted(payload.old);
        }
      }
    )
    .subscribe();

  return () => {
    console.log(`[Realtime Notification] Unsubscribing channel for user ${userId}`);
    supabase.removeChannel(channel);
  };
}

