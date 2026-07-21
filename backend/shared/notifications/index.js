const { logOutboundNotification, createAppNotification, sendEmail, sendSMS } = require('./notifications');
const { sendPushNotification } = require('./pushNotifications');

module.exports = {
  logOutboundNotification,
  createAppNotification,
  sendEmail,
  sendSMS,
  sendPushNotification
};
