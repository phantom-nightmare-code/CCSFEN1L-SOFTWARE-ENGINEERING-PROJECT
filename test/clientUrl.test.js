const test = require('node:test');
const assert = require('node:assert/strict');
const { buildClientUrl } = require('../services/clientUrl');

test('builds client URLs without duplicate slashes', () => {
  assert.equal(
    buildClientUrl('/verify-email/token', 'https://fitforge-gym-and-track.pages.dev/'),
    'https://fitforge-gym-and-track.pages.dev/verify-email/token'
  );
});

test('rejects missing client URL configuration', () => {
  assert.throws(() => buildClientUrl('/verify-email/token', ''), /CLIENT_URL is not configured/);
});
