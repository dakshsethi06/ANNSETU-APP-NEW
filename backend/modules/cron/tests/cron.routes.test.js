const express = require('express');
const cronRoutes = require('../cron.routes');

describe('cron.routes', () => {
  test('exports an express router', () => {
    expect(cronRoutes).toBeDefined();
    expect(Array.isArray(cronRoutes.stack)).toBe(true);
  });
});
