const storageRoutes = require('../storage.routes');

describe('Storage Routes', () => {
  test('exports express router instance', () => {
    expect(storageRoutes).toBeDefined();
    expect(Array.isArray(storageRoutes.stack)).toBe(true);
  });

  test('contains correct routes and paths', () => {
    const paths = storageRoutes.stack.map(layer => layer.route ? layer.route.path : null).filter(Boolean);
    
    expect(paths).toContain('/cold-storages');
    expect(paths).toContain('/cold-storage/summary');
  });
});
