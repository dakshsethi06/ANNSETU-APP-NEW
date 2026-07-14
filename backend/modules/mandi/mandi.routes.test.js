const express = require('express');
const mandiRoutes = require('./mandi.routes');

describe('Mandi Routes', () => {
  it('should export a valid express router', () => {
    // A valid router should have standard router methods
    expect(mandiRoutes).toBeDefined();
    expect(typeof mandiRoutes).toBe('function');
    expect(mandiRoutes.name).toBe('router');
    expect(mandiRoutes.stack).toBeDefined();
    expect(Array.isArray(mandiRoutes.stack)).toBe(true);
  });
});
