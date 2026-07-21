const express = require('express');
const paymentRoutes = require('../payment.routes');

describe('Payment Routes', () => {
  test('exports express router instance', () => {
    expect(paymentRoutes).toBeDefined();
    expect(Array.isArray(paymentRoutes.stack)).toBe(true);
  });
});
