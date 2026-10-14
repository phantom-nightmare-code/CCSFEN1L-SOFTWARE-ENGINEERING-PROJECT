const pool = require('../db/mysql');

async function logAdminAction({ adminId, action, targetType, targetId, details, req }) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log
        (admin_id, action, target_type, target_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        action,
        targetType || null,
        targetId || null,
        details ? JSON.stringify(details) : null,
        req?.ip || null,
        req?.headers?.['user-agent'] || null,
      ]
    );
  } catch (err) {
    console.error('[audit] Failed to log:', err.message);
  }
}

module.exports = { logAdminAction };