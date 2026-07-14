const routes = require('../index');

describe('notification index.js export', () => {
  test('should export the routes router', () => {
    expect(routes).toBeDefined();
    expect(typeof routes).toBe('function');
  });
});
