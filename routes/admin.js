const express = require('express');
const crypto = require('crypto');
const pool = require('../db/mysql');
const ActivityLog = require('../models/mongo/ActivityLog');
const AdminMetric = require('../models/mongo/AdminMetric');
const PaymentLog = require('../models/mongo/PaymentLog');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logAdminAction } = require('../services/auditLogger');

const router = express.Router();
router.use(authenticate, requireAdmin);

/* ============================================================
   AGGREGATE STATS
   ============================================================ */

router.get('/stats/aggregate', async (_req, res, next) => {
  try {
    const payments = await PaymentLog.find({}).lean();

    const totalSpent = payments
      .filter(p => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const totalRefunded = payments
      .filter(p => p.status === 'refunded')
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const totalTransactions = payments.length;
    const refundedTransactionsCount = payments.filter(p => p.status === 'refunded').length;
    const uniqueUsersCount = new Set(payments.map(p => p.userId)).size;
    const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;

    const [[{ activeRentals }]] = await pool.query(
      `SELECT COUNT(*) AS activeRentals FROM rentals
       WHERE status IN ('active','reserved','confirmed','hold')`
    );

    res.json({
      totalSpent, totalRefunded, totalTransactions,
      refundedTransactionsCount, uniqueUsersCount, activeRentals,
      pendingPayments: pendingPaymentsCount,
    });
  } catch (err) { next(err); }
});

/* ============================================================
   USERS
   ============================================================ */

router.get('/users', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, username, full_name, role, created_at, pending_deletion_at
       FROM users ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'coach'].includes(role))
      return res.status(400).json({ error: 'Invalid role' });

    if (Number(req.params.id) === req.user.id)
      return res.status(400).json({ error: 'You cannot change your own role' });

    const [[oldUser]] = await pool.query(
      'SELECT email, role FROM users WHERE id = ?', [req.params.id]
    );
    if (!oldUser) return res.status(404).json({ error: 'User not found' });

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    await logAdminAction({
      adminId: req.user.id,
      action: 'user_role_changed',
      targetType: 'user',
      targetId: Number(req.params.id),
      details: { email: oldUser.email, from: oldUser.role, to: role },
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ============================================================
   USER REMOVAL — scheduled with revocation window
   ============================================================ */

router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { reason } = req.body;

    if (userId === req.user.id)
      return res.status(400).json({ error: 'You cannot delete your own account' });

    if (!reason || reason.trim().length < 5)
      return res.status(400).json({ error: 'Please provide a reason (min 5 characters)' });

    const [[user]] = await pool.query(
      'SELECT id, email, username, full_name, role FROM users WHERE id = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'admin')
      return res.status(400).json({ error: 'Cannot delete another admin. Demote first.' });

    if (user.role === 'coach') {
      const [[{ activeClients }]] = await pool.query(
        `SELECT COUNT(*) AS activeClients FROM coach_clients
         WHERE coach_id = ? AND status = 'active'`,
        [userId]
      );
      if (activeClients > 0)
        return res.status(400).json({
          error: `Cannot remove — coach has ${activeClients} active client(s). Reassign first.`,
        });
    }

    // Schedule deletion 7 days from now
    const token = crypto.randomBytes(32).toString('hex');
    const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users
       SET pending_deletion_at = ?, deletion_token = ?, deletion_reason = ?
       WHERE id = ?`,
      [deletionDate, token, reason.trim(), userId]
    );

    // Email the user (fire-and-forget)
    try {
      const { sendAccountDeletionNoticeEmail } = require('../services/mailer');
      const revokeUrl = `${process.env.CLIENT_URL}/revoke-deletion/${token}`;
      await sendAccountDeletionNoticeEmail({
        to: user.email,
        fullName: user.full_name || user.username,
        reason: reason.trim(),
        deletionDate: deletionDate.toLocaleDateString(undefined, {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }),
        revokeUrl,
      });
    } catch (mailErr) {
      console.error('Deletion notice email failed:', mailErr.message);
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'user_removal_scheduled',
      targetType: 'user',
      targetId: userId,
      details: {
        removedUser: { email: user.email, username: user.username, role: user.role },
        reason: reason.trim(),
        scheduledFor: deletionDate.toISOString(),
      },
      req,
    });

    res.json({ ok: true, scheduledFor: deletionDate, revocationEmailSent: true });
  } catch (err) { next(err); }
});

router.delete('/users/:id/force', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user.id)
      return res.status(400).json({ error: 'Cannot delete yourself' });

    const [[user]] = await pool.query(
      'SELECT id, email, role FROM users WHERE id = ? AND pending_deletion_at IS NOT NULL',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'Not a pending-deletion user' });
    if (user.role === 'admin')
      return res.status(400).json({ error: 'Cannot delete another admin' });

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    await logAdminAction({
      adminId: req.user.id,
      action: 'user_removed_forced',
      targetType: 'user',
      targetId: userId,
      details: { email: user.email },
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch('/users/:id/cancel-removal', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    const [[user]] = await pool.query(
      'SELECT id, email FROM users WHERE id = ? AND pending_deletion_at IS NOT NULL',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'Not a pending-deletion user' });

    await pool.query(
      `UPDATE users
       SET pending_deletion_at = NULL, deletion_token = NULL, deletion_reason = NULL
       WHERE id = ?`,
      [userId]
    );

    await logAdminAction({
      adminId: req.user.id,
      action: 'user_removal_cancelled',
      targetType: 'user',
      targetId: userId,
      details: { email: user.email },
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/users/pending-deletions', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, username, full_name, role,
              pending_deletion_at, deletion_reason
       FROM users
       WHERE pending_deletion_at IS NOT NULL
       ORDER BY pending_deletion_at ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/users/:id/details', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    const [[user]] = await pool.query(
      `SELECT id, email, username, full_name, role, created_at, birthday,
              pending_deletion_at, deletion_reason
       FROM users WHERE id = ?`,
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [[{ workoutCount }]] = await pool.query(
      'SELECT COUNT(*) AS workoutCount FROM workouts WHERE user_id = ?', [userId]
    );
    const [[{ prCount }]] = await pool.query(
      'SELECT COUNT(*) AS prCount FROM personal_records WHERE user_id = ?', [userId]
    );
    const [memberships] = await pool.query(
      'SELECT * FROM memberships WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]
    );
    const [rentals] = await pool.query(
      `SELECT r.*, i.name AS item_name
       FROM rentals r JOIN rental_items i ON i.id = r.item_id
       WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 20`, [userId]
    );
    const [workouts] = await pool.query(
      `SELECT id, name, workout_date, notes FROM workouts
       WHERE user_id = ? ORDER BY workout_date DESC LIMIT 10`, [userId]
    );

    const payments = await PaymentLog.find({ userId })
      .sort({ createdAt: -1 }).limit(20).lean();

    const totalSpent = payments
      .filter(p => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const recentActivity = await ActivityLog.find({ userId })
      .sort({ createdAt: -1 }).limit(10).lean();

    res.json({
      user,
      stats: {
        workoutCount, prCount,
        membershipCount: memberships.length,
        rentalCount: rentals.length,
        paymentCount: payments.length,
        totalSpent,
      },
      memberships, rentals, workouts, payments,
      activity: recentActivity,
    });
  } catch (err) { next(err); }
});

/* ============================================================
   STATS
   ============================================================ */

router.get('/stats', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.range) || 30, 365);
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const metrics = await AdminMetric.find({ date: { $gte: from } }).sort('date').lean();

    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ totalWorkouts }]] = await pool.query('SELECT COUNT(*) AS totalWorkouts FROM workouts');

    res.json({ metrics, totalUsers, totalWorkouts });
  } catch (err) { next(err); }
});

router.get('/revenue', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const from = new Date(Date.now() - days * 86400000);

    const [daily, byMethod, byPurpose] = await Promise.all([
      PaymentLog.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: from } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' }, count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      PaymentLog.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: from } } },
        { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      PaymentLog.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: from } } },
        { $group: { _id: '$purpose', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const grandTotal = daily.reduce((s, d) => s + d.total, 0);
    res.json({ daily, byMethod, byPurpose, grandTotal, days });
  } catch (err) { next(err); }
});

/* ============================================================
   ACTIVITY
   ============================================================ */

router.get('/activity', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json(logs);
  } catch (err) { next(err); }
});

/* ============================================================
   AUDIT LOG
   ============================================================ */

router.get('/audit-log', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const [rows] = await pool.query(
      `SELECT a.*, u.email AS admin_email, u.full_name AS admin_name
       FROM admin_audit_log a
       JOIN users u ON u.id = a.admin_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ============================================================
   MEMBERSHIPS
   ============================================================ */

router.get('/memberships', async (req, res, next) => {
  try {
    const { userId } = req.query;
    let sql = `
      SELECT m.*, u.email, u.username, u.full_name
      FROM memberships m
      JOIN users u ON u.id = m.user_id
    `;
    const params = [];
    if (userId) { sql += ' WHERE m.user_id = ?'; params.push(userId); }
    sql += ' ORDER BY m.created_at DESC LIMIT 500';
    const [rows] = await pool.query(sql, params);

    const ids = rows.map(r => r.id);
    let refundedSet = new Set();
    if (ids.length) {
      const refunded = await PaymentLog.find({
        purpose: 'membership',
        referenceId: { $in: ids },
        status: 'refunded',
      }).select('referenceId').lean();
      refundedSet = new Set(refunded.map(r => r.referenceId));
    }

    res.json(rows.map(r => ({ ...r, has_refund: refundedSet.has(r.id) })));
  } catch (err) { next(err); }
});

router.patch('/memberships/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const id = Number(req.params.id);

    if (!['active', 'cancelled', 'cancelled_refund', 'pending'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const [[existing]] = await pool.query(
      'SELECT id, type, user_id, status FROM memberships WHERE id = ?', [id]
    );
    if (!existing) return res.status(404).json({ error: 'Membership not found' });

    const dbStatus = status === 'cancelled_refund' ? 'cancelled' : status;
    let paymentsRefunded = 0;
    let paymentsActivated = 0;

    await pool.query('UPDATE memberships SET status = ? WHERE id = ?', [dbStatus, id]);

    if (status === 'cancelled_refund') {
      const r = await PaymentLog.updateMany(
        { purpose: 'membership', referenceId: id, status: 'paid' },
        { $set: { status: 'refunded', refundedAt: new Date() } }
      );
      paymentsRefunded = r.modifiedCount;
    } else if (status === 'active') {
      const r1 = await PaymentLog.updateMany(
        { purpose: 'membership', referenceId: id, status: 'refunded' },
        { $set: { status: 'paid' }, $unset: { refundedAt: '' } }
      );
      const r2 = await PaymentLog.updateMany(
        {
          purpose: 'membership',
          referenceId: id,
          status: { $in: ['pending', 'failed'] },
        },
        { $set: { status: 'paid', verifiedAt: new Date() } }
      );
      paymentsRefunded = -r1.modifiedCount;
      paymentsActivated = r2.modifiedCount;
    } else if (status === 'pending') {
      const r = await PaymentLog.updateMany(
        { purpose: 'membership', referenceId: id, status: 'paid' },
        { $set: { status: 'pending' }, $unset: { verifiedAt: '' } }
      );
      paymentsActivated = -r.modifiedCount;
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'membership_status_changed',
      targetType: 'membership',
      targetId: id,
      details: {
        from: existing.status, to: dbStatus,
        userId: existing.user_id, paymentsActivated,
      },
      req,
    });

    res.json({ ok: true, status, paymentsRefunded, paymentsActivated });
  } catch (err) { next(err); }
});

/* ============================================================
   RENTALS
   ============================================================ */

router.get('/rentals', async (req, res, next) => {
  try {
    const { userId } = req.query;
    let sql = `
      SELECT r.*, i.name AS item_name, u.email, u.username, u.full_name
      FROM rentals r
      JOIN rental_items i ON i.id = r.item_id
      JOIN users u ON u.id = r.user_id
    `;
    const params = [];
    if (userId) { sql += ' WHERE r.user_id = ?'; params.push(userId); }
    sql += ' ORDER BY r.created_at DESC LIMIT 500';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/rentals/:id/status', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { status } = req.body;
    const id = Number(req.params.id);

    if (!['reserved', 'confirmed', 'hold', 'available', 'cancelled', 'active', 'returned'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    await conn.beginTransaction();

    const [[rental]] = await conn.query(
      'SELECT * FROM rentals WHERE id = ? FOR UPDATE', [id]
    );
    if (!rental) throw Object.assign(new Error('Rental not found'), { status: 404 });

    const consumedStates = ['reserved', 'confirmed', 'hold', 'active'];
    const previouslyConsumed = consumedStates.includes(rental.status);
    const nowConsumed = consumedStates.includes(status);

    let stockDelta = 0;
    if (previouslyConsumed && !nowConsumed) stockDelta = +rental.quantity;
    if (!previouslyConsumed && nowConsumed) stockDelta = -rental.quantity;

    if (stockDelta !== 0) {
      await conn.query(
        'UPDATE rental_items SET stock = stock + ? WHERE id = ?',
        [stockDelta, rental.item_id]
      );
    }

    await conn.query('UPDATE rentals SET status = ? WHERE id = ?', [status, id]);
    await conn.commit();

    let paymentsRefunded = 0;
    let paymentsActivated = 0;

    if (status === 'cancelled') {
      const r = await PaymentLog.updateMany(
        { purpose: 'rental', referenceId: id, status: 'paid' },
        { $set: { status: 'refunded', refundedAt: new Date() } }
      );
      paymentsRefunded = r.modifiedCount;
    } else if (status === 'active') {
      const r = await PaymentLog.updateMany(
        {
          purpose: 'rental',
          referenceId: id,
          status: { $in: ['pending', 'failed'] },
        },
        { $set: { status: 'paid', verifiedAt: new Date() } }
      );
      paymentsActivated = r.modifiedCount;
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'rental_status_changed',
      targetType: 'rental',
      targetId: id,
      details: { from: rental.status, to: status, itemId: rental.item_id, paymentsActivated },
      req,
    });

    res.json({ ok: true, status, paymentsRefunded, paymentsActivated });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
});

/* ============================================================
   RENTAL ITEMS
   ============================================================ */

router.get('/rental-items', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rental_items ORDER BY category, name');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/rental-items', async (req, res, next) => {
  try {
    const { name, category, description, hourly_rate, stock, image_url } = req.body;
    if (!name || hourly_rate == null)
      return res.status(400).json({ error: 'name and hourly_rate required' });

    const [r] = await pool.query(
      `INSERT INTO rental_items (name, category, description, hourly_rate, stock, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, category || null, description || null, hourly_rate, stock ?? 0, image_url || null]
    );

    await logAdminAction({
      adminId: req.user.id,
      action: 'rental_item_created',
      targetType: 'rental_item',
      targetId: r.insertId,
      details: { name, hourly_rate, stock },
      req,
    });

    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

router.patch('/rental-items/:id', async (req, res, next) => {
  try {
    const { name, category, description, hourly_rate, stock, image_url } = req.body;
    const fields = [];
    const params = [];
    if (name        !== undefined) { fields.push('name = ?');        params.push(name); }
    if (category    !== undefined) { fields.push('category = ?');    params.push(category); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (hourly_rate !== undefined) { fields.push('hourly_rate = ?'); params.push(hourly_rate); }
    if (stock       !== undefined) { fields.push('stock = ?');       params.push(stock); }
    if (image_url   !== undefined) { fields.push('image_url = ?');   params.push(image_url); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    await pool.query(`UPDATE rental_items SET ${fields.join(', ')} WHERE id = ?`, params);

    await logAdminAction({
      adminId: req.user.id,
      action: 'rental_item_updated',
      targetType: 'rental_item',
      targetId: Number(req.params.id),
      details: { fields: Object.keys(req.body) },
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/rental-items/:id', async (req, res, next) => {
  try {
    const [[{ active }]] = await pool.query(
      `SELECT COUNT(*) AS active FROM rentals
       WHERE item_id = ? AND status IN ('reserved','active','confirmed','hold')`,
      [req.params.id]
    );
    if (active > 0)
      return res.status(400).json({
        error: `Cannot delete — ${active} active rental(s) reference this item`,
      });

    await pool.query('DELETE FROM rental_items WHERE id = ?', [req.params.id]);

    await logAdminAction({
      adminId: req.user.id,
      action: 'rental_item_deleted',
      targetType: 'rental_item',
      targetId: Number(req.params.id),
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ============================================================
   EXERCISES
   ============================================================ */

router.get('/exercises', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM exercises ORDER BY muscle_group, name');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/exercises', async (req, res, next) => {
  try {
    const { name, muscle_group, equipment, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const [r] = await pool.query(
      `INSERT INTO exercises (name, muscle_group, equipment, description)
       VALUES (?, ?, ?, ?)`,
      [name, muscle_group || null, equipment || null, description || null]
    );

    await logAdminAction({
      adminId: req.user.id,
      action: 'exercise_created',
      targetType: 'exercise',
      targetId: r.insertId,
      details: { name, muscle_group },
      req,
    });

    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

router.patch('/exercises/:id', async (req, res, next) => {
  try {
    const { name, muscle_group, equipment, description } = req.body;
    const fields = [];
    const params = [];
    if (name         !== undefined) { fields.push('name = ?');         params.push(name); }
    if (muscle_group !== undefined) { fields.push('muscle_group = ?'); params.push(muscle_group); }
    if (equipment    !== undefined) { fields.push('equipment = ?');    params.push(equipment); }
    if (description  !== undefined) { fields.push('description = ?');  params.push(description); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    await pool.query(`UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`, params);

    await logAdminAction({
      adminId: req.user.id,
      action: 'exercise_updated',
      targetType: 'exercise',
      targetId: Number(req.params.id),
      details: { fields: Object.keys(req.body) },
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/exercises/:id', async (req, res, next) => {
  try {
    const [[{ refs }]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM workout_sets      WHERE exercise_id = ?) +
         (SELECT COUNT(*) FROM routine_exercises WHERE exercise_id = ?) +
         (SELECT COUNT(*) FROM personal_records  WHERE exercise_id = ?) AS refs`,
      [req.params.id, req.params.id, req.params.id]
    );
    if (refs > 0)
      return res.status(400).json({
        error: `Cannot delete — used in ${refs} workout/routine/PR record(s)`,
      });

    await pool.query('DELETE FROM exercises WHERE id = ?', [req.params.id]);

    await logAdminAction({
      adminId: req.user.id,
      action: 'exercise_deleted',
      targetType: 'exercise',
      targetId: Number(req.params.id),
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ============================================================
   PENDING PAYMENTS
   ============================================================ */

router.get('/payments/pending', async (_req, res, next) => {
  try {
    const payments = await PaymentLog.find({ status: 'pending' })
      .sort({ createdAt: -1 }).lean();

    const userIds = [...new Set(payments.map(p => p.userId))];
    let users = [];
    if (userIds.length) {
      [users] = await pool.query(
        'SELECT id, email, username, full_name FROM users WHERE id IN (?)',
        [userIds]
      );
    }
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    res.json(payments.map(p => ({
      ...p,
      user: userMap[p.userId] || { id: p.userId, email: 'Unknown' },
    })));
  } catch (err) { next(err); }
});

/* ============================================================
   CLEAR ALL PAYMENTS
   ============================================================ */

router.delete('/payments/clear-all', async (req, res, next) => {
  try {
    const { confirmText } = req.body;

    if (confirmText !== 'DELETE ALL PAYMENTS') {
      return res.status(400).json({
        error: 'Confirmation text does not match. Type "DELETE ALL PAYMENTS" exactly.',
      });
    }

    const before = await PaymentLog.countDocuments();

    const result = await PaymentLog.deleteMany({});
    await AdminMetric.deleteMany({});

    await logAdminAction({
      adminId: req.user.id,
      action: 'all_payments_cleared',
      targetType: 'payment_logs',
      targetId: 0,
      details: { deletedCount: result.deletedCount, beforeCount: before },
      req,
    });

    res.json({
      ok: true,
      deletedCount: result.deletedCount,
      message: `Cleared ${result.deletedCount} payment records.`,
    });
  } catch (err) { next(err); }
});

router.patch('/payments/:id/verify', async (req, res, next) => {
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    const payment = await PaymentLog.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'pending')
      return res.status(400).json({ error: 'Only pending payments can be verified' });

    await conn.beginTransaction();
    transactionStarted = true;

    if (payment.purpose === 'membership' && payment.referenceId) {
      const [[membership]] = await conn.query(
        `SELECT id, user_id FROM memberships
         WHERE id = ? AND user_id = ? AND status = 'pending'
         FOR UPDATE`,
        [payment.referenceId, payment.userId]
      );
      if (!membership)
        throw Object.assign(new Error('Pending membership not found'), { status: 409 });

      await conn.query(
        `UPDATE memberships SET status = 'cancelled'
         WHERE user_id = ? AND status = 'active'`,
        [payment.userId]
      );
      await conn.query(
        `UPDATE memberships SET status = 'active' WHERE id = ?`,
        [membership.id]
      );
    } else if (payment.purpose === 'rental' && payment.referenceId) {
      const [[rental]] = await conn.query(
        `SELECT id FROM rentals
         WHERE id = ? AND user_id = ? AND status = 'reserved'
         FOR UPDATE`,
        [payment.referenceId, payment.userId]
      );
      if (!rental)
        throw Object.assign(new Error('Reserved rental not found'), { status: 409 });
      await conn.query(
        `UPDATE rentals SET status = 'active' WHERE id = ?`,
        [rental.id]
      );
    } else {
      throw Object.assign(new Error('Unsupported payment purchase'), { status: 400 });
    }

    payment.status = 'paid';
    payment.verifiedAt = new Date();
    await payment.save();
    await conn.commit();
    transactionStarted = false;

    // ✅ NEW: Send the receipt email to the user
    try {
      const { sendPaymentReceiptEmail } = require('../services/mailer');
      const [rows] = await pool.query(
        'SELECT email, full_name, username FROM users WHERE id=?', 
        [payment.userId]
      );
      if (rows.length) {
        const user = rows[0];
        await sendPaymentReceiptEmail({
          to: user.email,
          userName: user.full_name || user.username,
          reference: payment.reference,
          amount: payment.amount,
          method: payment.method,
          purpose: payment.purpose,
          date: payment.verifiedAt,
          itemName: payment.details?.items?.find(i => i.label === 'Item')?.value,
        });
      }
    } catch (e) {
      console.error('Receipt email failed:', e.message);
    }

    // Keep your existing result email as well
    try {
      const { sendPaymentResultEmail } = require('../services/mailer');
      const [rows] = await pool.query('SELECT email FROM users WHERE id=?', [payment.userId]);
      if (rows.length) {
        await sendPaymentResultEmail({
          to: rows[0].email,
          reference: payment.reference,
          amount: payment.amount,
          status: 'verified',
        });
      }
    } catch (e) {
      console.error('Result email failed:', e.message);
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'payment_verified',
      targetType: 'payment',
      targetId: payment._id.toString(),
      details: { reference: payment.reference, amount: payment.amount, method: payment.method },
      req,
    });

    res.json({ ok: true });
  } catch (err) {
    if (transactionStarted) await conn.rollback();
    next(err);
  }
  finally { conn.release(); }
});

router.patch('/payments/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await PaymentLog.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'failed';
    payment.rejectedAt = new Date();
    if (reason) payment.details = { ...(payment.details || {}), rejectionReason: reason };
    await payment.save();

    if (payment.purpose === 'membership' && payment.referenceId) {
      await pool.query(
        `UPDATE memberships SET status='cancelled' WHERE id=? AND status='pending'`,
        [payment.referenceId]
      );
    }

    if (payment.purpose === 'rental' && payment.referenceId) {
      const [[rental]] = await pool.query(
        'SELECT * FROM rentals WHERE id=? AND status IN (?,?)',
        [payment.referenceId, 'reserved', 'hold']
      );
      if (rental) {
        await pool.query(
          'UPDATE rental_items SET stock = stock + ? WHERE id = ?',
          [rental.quantity, rental.item_id]
        );
        await pool.query(`UPDATE rentals SET status='cancelled' WHERE id=?`, [rental.id]);
      }
    }

    try {
      const { sendPaymentResultEmail } = require('../services/mailer');
      const [rows] = await pool.query('SELECT email FROM users WHERE id=?', [payment.userId]);
      if (rows.length) {
        await sendPaymentResultEmail({
          to: rows[0].email,
          reference: payment.reference,
          amount: payment.amount,
          status: 'rejected',
          reason,
        });
      }
    } catch (e) {
      console.error('Result email failed:', e.message);
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'payment_rejected',
      targetType: 'payment',
      targetId: payment._id.toString(),
      details: { reference: payment.reference, amount: payment.amount, reason },
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/payments/:id/resend-email', async (req, res, next) => {
  try {
    const QRCode = require('qrcode');
    const { parseEmails, sendPaymentVerificationEmail } = require('../services/mailer');
    const { sendTo } = req.body;

    const payment = await PaymentLog.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'pending')
      return res.status(400).json({ error: 'Only pending payments can be resent' });

    const verifyUrl = `${process.env.CLIENT_URL}/verify-payment/${payment.reference}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const [rows] = await pool.query(
      'SELECT email FROM users WHERE id = ?', [payment.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User email not found' });

    const extras = parseEmails(sendTo);
    const recipients = [...new Set([rows[0].email.toLowerCase(), ...extras])];

    await sendPaymentVerificationEmail({
      to: rows[0].email,
      additionalTo: extras,
      qrDataUrl,
      reference: payment.reference,
      amount: payment.amount,
      method: payment.method,
      purpose: payment.purpose,
      itemName: payment.details?.items?.find(i => i.label === 'Item')?.value,
    });

    await logAdminAction({
      adminId: req.user.id,
      action: 'payment_email_resent',
      targetType: 'payment',
      targetId: payment._id.toString(),
      details: { reference: payment.reference, recipients },
      req,
    });

    res.json({ ok: true, sentTo: rows[0].email, additional: extras, recipients });
  } catch (err) {
    console.error('Admin resend failed:', err);
    res.status(500).json({ error: err.message || 'Send failed' });
  }
});

/* ============================================================
   COACH PAYMENTS (admin view)
   ============================================================ */

router.get('/coach-payments', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*,
              m.full_name AS member_name, m.username AS member_username, m.email AS member_email,
              c.full_name AS coach_name, c.username AS coach_username, c.email AS coach_email
       FROM coach_payments cp
       JOIN users m ON m.id = cp.member_id
       JOIN users c ON c.id = cp.coach_id
       ORDER BY cp.created_at DESC LIMIT 500`
    );

    const totalPaid = rows
      .filter(r => r.status === 'paid')
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const totalPending = rows
      .filter(r => r.status === 'pending')
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const byCoach = {};
    rows.forEach(r => {
      const key = r.coach_id;
      if (!byCoach[key]) {
        byCoach[key] = {
          coach_id: r.coach_id,
          coach_name: r.coach_name || r.coach_username || r.coach_email,
          coach_email: r.coach_email,
          earned: 0,
          pending: 0,
          count: 0,
        };
      }
      if (r.status === 'paid')    byCoach[key].earned  += Number(r.amount || 0);
      if (r.status === 'pending') byCoach[key].pending += Number(r.amount || 0);
      byCoach[key].count += 1;
    });

    res.json({
      payments: rows,
      stats: {
        totalPaid,
        totalPending,
        totalCount: rows.length,
        uniqueCoaches: Object.keys(byCoach).length,
      },
      byCoach: Object.values(byCoach).sort((a, b) => b.earned - a.earned),
    });
  } catch (err) { next(err); }
});

/* ============================================================
   COACHES
   ============================================================ */

router.get('/coaches', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.username, u.full_name, u.created_at,
              u.coach_hourly_rate,
              (SELECT COUNT(*) FROM coach_clients
               WHERE coach_id = u.id AND status = 'active') AS clientCount,
              (SELECT COALESCE(AVG(rating), 0) FROM coach_ratings
               WHERE coach_id = u.id) AS avgRating,
              (SELECT COUNT(*) FROM coach_ratings
               WHERE coach_id = u.id) AS ratingCount
       FROM users u
       WHERE u.role = 'coach'
       ORDER BY u.full_name, u.email`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/coach-assignments', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cc.id, cc.coach_id, cc.client_id, cc.status, cc.assigned_at,
              coach.email AS coach_email, coach.full_name AS coach_name,
              client.email AS client_email, client.full_name AS client_name
       FROM coach_clients cc
       JOIN users coach  ON coach.id  = cc.coach_id
       JOIN users client ON client.id = cc.client_id
       ORDER BY cc.assigned_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/coach-assignments', async (req, res, next) => {
  try {
    const { coachId, clientId } = req.body;
    if (!coachId || !clientId)
      return res.status(400).json({ error: 'coachId and clientId required' });
    if (Number(coachId) === Number(clientId))
      return res.status(400).json({ error: 'Coach and client must be different users' });

    const [[coach]] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role IN ('coach','admin')", [coachId]
    );
    if (!coach) return res.status(400).json({ error: 'Coach not found' });

    const [[client]] = await pool.query(
      'SELECT id FROM users WHERE id = ?', [clientId]
    );
    if (!client) return res.status(400).json({ error: 'Client not found' });

    await pool.query(
      `INSERT INTO coach_clients (coach_id, client_id, status)
       VALUES (?, ?, 'active')
       ON DUPLICATE KEY UPDATE status = 'active'`,
      [coachId, clientId]
    );

    await logAdminAction({
      adminId: req.user.id,
      action: 'coach_assigned',
      targetType: 'coach_client',
      targetId: Number(coachId),
      details: { coachId, clientId },
      req,
    });

    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/coach-assignments/:id', async (req, res, next) => {
  try {
    const [[assignment]] = await pool.query(
      'SELECT coach_id, client_id FROM coach_clients WHERE id = ?', [req.params.id]
    );
    await pool.query('DELETE FROM coach_clients WHERE id = ?', [req.params.id]);

    if (assignment) {
      await logAdminAction({
        adminId: req.user.id,
        action: 'coach_unassigned',
        targetType: 'coach_client',
        targetId: Number(req.params.id),
        details: assignment,
        req,
      });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ============================================================
   COACH RATINGS (admin management)
   ============================================================ */

router.get('/coaches/:id/ratings', async (req, res, next) => {
  try {
    const coachId = Number(req.params.id);

    const [[coach]] = await pool.query(
      'SELECT id, full_name, username, email, coach_hourly_rate FROM users WHERE id = ? AND role = "coach"',
      [coachId]
    );
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    const [ratings] = await pool.query(
      `SELECT cr.id, cr.rating, cr.review, cr.created_at, cr.updated_at,
              u.id AS member_id, u.full_name AS member_name,
              u.username AS member_username, u.email AS member_email
       FROM coach_ratings cr
       JOIN users u ON u.id = cr.member_id
       WHERE cr.coach_id = ?
       ORDER BY cr.created_at DESC`,
      [coachId]
    );

    const [[stats]] = await pool.query(
      `SELECT COALESCE(AVG(rating), 0) AS avgRating, COUNT(*) AS total
       FROM coach_ratings WHERE coach_id = ?`,
      [coachId]
    );

    res.json({
      coach,
      ratings,
      stats: { avgRating: Number(stats.avgRating), total: Number(stats.total) },
    });
  } catch (err) { next(err); }
});

router.post('/coaches/:id/ratings', async (req, res, next) => {
  try {
    const coachId = Number(req.params.id);
    const { memberId, rating, review } = req.body;

    if (!memberId || !rating)
      return res.status(400).json({ error: 'memberId and rating required' });

    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)
      return res.status(400).json({ error: 'Rating must be 1-5' });

    const [[coach]] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND role = "coach"', [coachId]
    );
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    const [[member]] = await pool.query(
      'SELECT id FROM users WHERE id = ?', [memberId]
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await pool.query(
      `INSERT INTO coach_ratings (coach_id, member_id, rating, review)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review)`,
      [coachId, memberId, ratingNum, review || null]
    );

    await logAdminAction({
      adminId: req.user.id,
      action: 'coach_rating_created',
      targetType: 'coach_rating',
      targetId: coachId,
      details: { coachId, memberId, rating: ratingNum },
      req,
    });

    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.patch('/coaches/:id/ratings/:ratingId', async (req, res, next) => {
  try {
    const ratingId = Number(req.params.ratingId);
    const { rating, review } = req.body;

    const fields = [];
    const params = [];

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)
        return res.status(400).json({ error: 'Rating must be 1-5' });
      fields.push('rating = ?');
      params.push(ratingNum);
    }
    if (review !== undefined) {
      fields.push('review = ?');
      params.push(review || null);
    }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(ratingId);
    await pool.query(
      `UPDATE coach_ratings SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    await logAdminAction({
      adminId: req.user.id,
      action: 'coach_rating_updated',
      targetType: 'coach_rating',
      targetId: ratingId,
      details: { ratingId, changes: req.body },
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/coaches/:id/ratings/:ratingId', async (req, res, next) => {
  try {
    const ratingId = Number(req.params.ratingId);
    const coachId = Number(req.params.id);

    const [[row]] = await pool.query(
      'SELECT id, rating, member_id FROM coach_ratings WHERE id = ? AND coach_id = ?',
      [ratingId, coachId]
    );
    if (!row) return res.status(404).json({ error: 'Rating not found' });

    await pool.query('DELETE FROM coach_ratings WHERE id = ?', [ratingId]);

    await logAdminAction({
      adminId: req.user.id,
      action: 'coach_rating_deleted',
      targetType: 'coach_rating',
      targetId: ratingId,
      details: { coachId, memberId: row.member_id, rating: row.rating },
      req,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
