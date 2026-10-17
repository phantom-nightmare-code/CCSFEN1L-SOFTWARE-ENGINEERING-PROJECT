const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const DELETION_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

function presenceStatus(lastSeenAt, now = new Date()) {
  if (!lastSeenAt) {
    return { status: 'unknown', offlineDays: null, offlineDurationMs: null };
  }

  const lastSeenTime = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(lastSeenTime)) {
    return { status: 'unknown', offlineDays: null, offlineDurationMs: null };
  }

  const elapsedMs = Math.max(0, now.getTime() - lastSeenTime);
  if (elapsedMs <= ONLINE_WINDOW_MS) {
    return { status: 'online', offlineDays: 0, offlineDurationMs: 0 };
  }

  return {
    status: 'offline',
    offlineDays: Math.floor(elapsedMs / 86_400_000),
    offlineDurationMs: elapsedMs,
  };
}

function canScheduleInactiveAccountDeletion({
  role,
  userId,
  adminId,
  pendingDeletionAt,
  status,
  offlineDurationMs,
}) {
  return role !== 'admin' &&
    Number(userId) !== Number(adminId) &&
    !pendingDeletionAt &&
    status === 'offline' &&
    offlineDurationMs != null &&
    offlineDurationMs > DELETION_INACTIVITY_MS;
}

module.exports = {
  ONLINE_WINDOW_MS,
  DELETION_INACTIVITY_MS,
  presenceStatus,
  canScheduleInactiveAccountDeletion,
};
