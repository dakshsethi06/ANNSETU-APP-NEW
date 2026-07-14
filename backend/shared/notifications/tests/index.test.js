const notificationsIndex = require('../index');

describe('shared notifications index.js export', () => {
  test('exports core notification utility handlers', () => {
    expect(notificationsIndex.logOutboundNotification).toBeDefined();
    expect(notificationsIndex.createAppNotification).toBeDefined();
    expect(notificationsIndex.sendEmail).toBeDefined();
    expect(notificationsIndex.sendSMS).toBeDefined();
    expect(notificationsIndex.sendPushNotification).toBeDefined();
  });
});
