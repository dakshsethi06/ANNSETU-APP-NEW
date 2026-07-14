const weatherRoutes = require('../weather.routes');

describe('Weather Routes', () => {
  test('exports express router instance', () => {
    expect(weatherRoutes).toBeDefined();
    expect(Array.isArray(weatherRoutes.stack)).toBe(true);
  });

  test('contains correct routes and paths', () => {
    const paths = weatherRoutes.stack.map(layer => layer.route ? layer.route.path : null).filter(Boolean);

    expect(paths).toContain('/weather');
  });
});
