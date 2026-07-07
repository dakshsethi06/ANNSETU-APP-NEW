const db = require('../../config/database');
const axios = require('axios');

/**
 * Sends a push notification to a specific user's registered device.
 * Queries the "User" table for a stored "pushToken" and uses the Expo Push API.
 * @param {string} userId - User or shadow farmer ID
 * @param {string} title - Push message title
 * @param {string} body - Push message body
 * @param {object} [data] - Optional metadata payload
 */
async function sendPushNotification(userId, title, body, data = {}) {
  if (!userId) return;
  try {
    // 1. Fetch user's registered push token
    const userRes = await db.query('SELECT "pushToken" FROM "User" WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return;

    const token = userRes.rows[0].pushToken;
    if (!token || !token.startsWith('ExponentPushToken')) {
      // No active or invalid token registered
      return;
    }

    console.log(`[Push Notification] Delivering message to user ${userId} via token ${token}`);

    // 2. Post to Expo Push Notification gateway
    const payload = {
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data
    };

    const response = await axios.post('https://exp.host/--/api/v2/push/send', payload, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      }
    });

    if (response.data && response.data.data) {
      console.log('[Push Notification] Response status:', response.data.data.status);
    }
  } catch (err) {
    console.error(`[Push Notification] Error sending to user ${userId}:`, err.message);
  }
}

module.exports = { sendPushNotification };