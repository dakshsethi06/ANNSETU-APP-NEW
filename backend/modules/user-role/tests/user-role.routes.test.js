const userRoleRoutes = require('../user-role.routes');

describe('User Role Routes', () => {
  test('exports express router instance', () => {
    expect(userRoleRoutes).toBeDefined();
    expect(Array.isArray(userRoleRoutes.stack)).toBe(true);
  });

  test('contains correct routes and paths', () => {
    const paths = userRoleRoutes.stack.map(layer => layer.route ? layer.route.path : null).filter(Boolean);

    expect(paths).toContain('/user-role');
  });
});
