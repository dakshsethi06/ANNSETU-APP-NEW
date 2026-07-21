const express = require('express');
const amadRoutes = require('../amad.routes');

describe('Amad Routes', () => {
  test('exports an express router', () => {
    expect(amadRoutes).toBeDefined();
    expect(Array.isArray(amadRoutes.stack)).toBe(true);
  });
});
