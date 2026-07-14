const express = require('express');
const dispatchRoutes = require('../dispatch.routes');

describe('dispatch.routes', () => {
  test('exports an express router', () => {
    // Verifies the module correctly initializes and exports a router instance
    expect(dispatchRoutes).toBeDefined();
    // Express routers have a 'stack' array containing layer configurations
    expect(Array.isArray(dispatchRoutes.stack)).toBe(true);
  });
});
