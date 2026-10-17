function inactivityDaysSince(lastLoginAt, createdAt, now = new Date()) {
  const referenceDate = lastLoginAt || createdAt;
  if (!referenceDate) return null;

  const timestamp = new Date(referenceDate).getTime();
  if (!Number.isFinite(timestamp)) return null;

  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

function canScheduleInactiveAccountDeletion({
  role,
  userId,
  adminId,
  pendingDeletionAt,
  inactivityDays,
}) {
  return role !== 'admin' &&
    Number(userId) !== Number(adminId) &&
    !pendingDeletionAt &&
    inactivityDays != null &&
    inactivityDays > 7;
}

module.exports = { inactivityDaysSince, canScheduleInactiveAccountDeletion };
