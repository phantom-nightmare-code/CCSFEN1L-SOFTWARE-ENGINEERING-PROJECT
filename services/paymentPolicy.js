const PAYMENT_METHODS = new Set(['cash', 'gcash', 'maya', 'bank', 'card']);

const MEMBERSHIP_PRICES = Object.freeze({
  'walk-in': 100,
  monthly: 1200,
  yearly: 12000,
});

function isPaymentMethod(method) {
  return PAYMENT_METHODS.has(method);
}

module.exports = { isPaymentMethod, MEMBERSHIP_PRICES };
