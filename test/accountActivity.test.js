const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ONLINE_WINDOW_MS,
  DELETION_INACTIVITY_MS,
  presenceStatus,
  canScheduleInactiveAccountDeletion,
} = require('../services/accountActivity');

test('classifies online presence within the heartbeat window', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  assert.deepEqual(
    presenceStatus(new Date(now.getTime() - ONLINE_WINDOW_MS), now),
    { status: 'online', offlineDays: 0, offlineDurationMs: 0 }
  );
  assert.deepEqual(
    presenceStatus(new Date(now.getTime() - ONLINE_WINDOW_MS - 1), now),
    { status: 'offline', offlineDays: 0, offlineDurationMs: ONLINE_WINDOW_MS + 1 }
  );
  assert.deepEqual(
    presenceStatus(null, now),
    { status: 'unknown', offlineDays: null, offlineDurationMs: null }
  );
  assert.deepEqual(
    presenceStatus('invalid-date', now),
    { status: 'unknown', offlineDays: null, offlineDurationMs: null }
  );
});

test('only permits deletion requests for non-admin accounts offline for more than seven days', () => {
  const base = {
    role: 'user',
    userId: 42,
    adminId: 1,
    pendingDeletionAt: null,
    status: 'offline',
    offlineDurationMs: DELETION_INACTIVITY_MS + 1,
  };

  assert.equal(canScheduleInactiveAccountDeletion(base), true);
  assert.equal(canScheduleInactiveAccountDeletion({
    ...base,
    offlineDurationMs: DELETION_INACTIVITY_MS,
  }), false);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, status: 'online' }), false);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, status: 'unknown' }), false);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, role: 'admin' }), false);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, userId: 1 }), false);
  assert.equal(canScheduleInactiveAccountDeletion({ ...base, pendingDeletionAt: new Date() }), false);
});
