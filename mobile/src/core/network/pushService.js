import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { BACKEND_URL } from './config';

/**
 * Requests push notification permissions and registers the push token on the backend server.
 * @param {string} userId - The active user's ID/phone number to associate the token with.
 */
export async function registerForPushNotificationsAsync(userId) {
  if (!userId) return null;

  try {
    // 1. Request permissions on Android / iOS
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push Service] Failed to get push token: Permission not granted');
      return null;
    }

    // 2. Configure Android notification channel (specifically required for Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E5C2E',
      });
    }

    // 3. Retrieve the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '707a1ebb-44c0-4817-a368-9f30711b04e9', // Matches EAS Project ID in app.json
    });
    
    const pushToken = tokenData.data;
    console.log('[Push Service] Generated Expo Push Token:', pushToken);

    // 4. Send the token to the backend server
    const response = await fetch(`${BACKEND_URL}/api/users/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        pushToken: pushToken,
      }),
    });

    const result = await response.json();
    if (response.ok && result.success) {
      console.log('[Push Service] Successfully registered push token with backend.');
    } else {
      console.warn('[Push Service] Backend registration failed:', result.error);
    }

    return pushToken;
  } catch (error) {
    console.warn('[Push Service] Error in push token registration:', error.message);
    return null;
  }
}