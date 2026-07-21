const supportRoutes = require('../support.routes');

describe('Support Routes', () => {
  test('exports express router instance', () => {
    expect(supportRoutes).toBeDefined();
    expect(Array.isArray(supportRoutes.stack)).toBe(true);
  });

  test('contains correct routes and paths', () => {
    const paths = supportRoutes.stack.map(layer => layer.route ? layer.route.path : null).filter(Boolean);

    expect(paths).toContain('/support/ticket');
    expect(paths).toContain('/support/tickets');
    expect(paths).toContain('/support/tickets/:id/conversations');
    expect(paths).toContain('/support/chat/start');
    expect(paths).toContain('/support/chat/active');
    expect(paths).toContain('/support/chat/:ticketId/message');
    expect(paths).toContain('/support/chat/:ticketId/messages');
    expect(paths).toContain('/support/chat/:ticketId/close');
    expect(paths).toContain('/support/chat/:ticketId/feedback');
  });
});
