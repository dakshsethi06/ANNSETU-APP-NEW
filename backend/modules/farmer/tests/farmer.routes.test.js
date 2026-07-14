const express = require('express');
const farmerRoutes = require('../farmer.routes');

describe('Farmer Routes', () => {
  test('exports an express router', () => {
    expect(farmerRoutes).toBeDefined();
    expect(Array.isArray(farmerRoutes.stack)).toBe(true);
  });
});
