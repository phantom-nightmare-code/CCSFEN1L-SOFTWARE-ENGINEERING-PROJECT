const test = require('node:test');
const assert = require('node:assert/strict');
const {
  inactivityDaysSince,
  canScheduleInactiveAccountDeletion,
} = require('../services/accountActivity');

test('calculates full inactive days using the last login or registration date', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  assert.equal(inactivityDaysSince('2026-10-10T13:00:00Z', null, now), 6);
  assert.equal(inactivityDaysSince(null, '2026-10-09T11:00:00Z', now), 8);
  assert.equal(inactivityDaysSince('2026-10-18T12:00:00Z', null, now), 0);
  assert.equal(inactivityDaysSince(null, null, now), null);
});

test('only permits deletion requests for non-admin accounts inactive for more than seven days', () => {
  const base = {
    role: 'user',
    userId: 42,
    adminId: 1,
    pendingDeletionAt: null,
    inactivityDays: 8,
  };

  assert.equal(canScheduleInactiveAccountDeletion(base), true);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, inactivityDays: 7 }), false);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, role: 'admin' }), false);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, userId: 1 }), false);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, pendingDeletionAt: new Date() }), false);
});
