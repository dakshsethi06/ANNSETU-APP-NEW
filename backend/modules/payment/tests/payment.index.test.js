const index = require('../index');
const routes = require('../payment.routes');

describe('payment index', () => {
  test('should export payment.routes', () => {
    expect(index).toBe(routes);
  });
});
