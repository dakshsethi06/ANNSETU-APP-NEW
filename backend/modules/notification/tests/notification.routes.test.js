const notificationRoutes = require('../notification.routes');

describe('Notification Routes', () => {
  test('exports express router instance', () => {
    expect(notificationRoutes).toBeDefined();
    expect(Array.isArray(notificationRoutes.stack)).toBe(true);
  });

  test('contains correct routes and paths', () => {
    const paths = notificationRoutes.stack.map(layer => layer.route ? layer.route.path : null).filter(Boolean);
    
    expect(paths).toContain('/notifications');
    expect(paths).toContain('/notifications/cleanup');
    expect(paths).toContain('/notifications/:id/read');
    expect(paths).toContain('/users/push-token');
  });
});
