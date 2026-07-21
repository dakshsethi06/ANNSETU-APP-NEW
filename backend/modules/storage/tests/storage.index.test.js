const routes = require('../index');

describe('storage index.js export', () => {
  test('should export the routes router', () => {
    expect(routes).toBeDefined();
    expect(typeof routes).toBe('function');
  });
});
