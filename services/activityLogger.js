const ActivityLog = require('../models/mongo/ActivityLog');
const AdminMetric = require('../models/mongo/AdminMetric');

async function logActivity({ userId, action, req, metadata }) {
  const today = new Date().toISOString().slice(0, 10);

  // 1) append the raw log
  await ActivityLog.create({
    userId,
    action,
    ip: req?.ip,
    userAgent: req?.headers?.['user-agent'],
    metadata,
  }).catch(err => console.error('ActivityLog write failed:', err.message));

  // 2) increment daily rollup
  const inc = {};
  if (action === 'login')           inc.logins = 1;
  if (action === 'register')        inc.registrations = 1;
  if (action === 'workout_created') inc.workoutsCreated = 1;

  if (Object.keys(inc).length || userId) {
    await AdminMetric.findOneAndUpdate(
      { date: today },
      {
        ...(Object.keys(inc).length ? { $inc: inc } : {}),
        ...(userId ? { $addToSet: { activeUsers: userId } } : {}),
      },
      { upsert: true }
    ).catch(err => console.error('AdminMetric update failed:', err.message));
  }
}

module.exports = { logActivity };