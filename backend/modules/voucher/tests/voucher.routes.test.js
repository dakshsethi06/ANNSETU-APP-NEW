const router = require('../voucher.routes');

describe('Voucher Routes Tests', () => {
  test('should export express router', () => {
    expect(router.stack).toBeDefined();
    // Check if routes are mounted
    const paths = router.stack.map(layer => layer.route?.path).filter(Boolean);
    expect(paths).toContain('/vouchers/apply');
    expect(paths).toContain('/vouchers/redeem');
  });
});
