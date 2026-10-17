const test = require('node:test');
const assert = require('node:assert/strict');
const { isPaymentMethod, MEMBERSHIP_PRICES } = require('../services/paymentPolicy');

test('accepts only supported payment methods', () => {
  for (const method of ['cash', 'gcash', 'maya', 'bank', 'card']) {
    assert.equal(isPaymentMethod(method), true);
  }

  for (const method of ['crypto', 'free', '', undefined]) {
    assert.equal(isPaymentMethod(method), false);
  }
});

test('membership prices come from the server policy', () => {
  assert.deepEqual(MEMBERSHIP_PRICES, {
    'walk-in': 100,
    monthly: 1200,
    yearly: 12000,
  });
});
