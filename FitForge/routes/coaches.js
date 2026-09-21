const express = require('express');
const pool = require('../db/mysql');
const { authenticate, requireCoach } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();
router.use(authenticate, requireCoach);

/* ============================================================
   COACH PROFILE
   ============================================================ */

router.get('/me', async (req, res, next) => {
  try {
    const [[coach]] = await pool.query(
      'SELECT id, email, username, full_name, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    const [[{ clientCount }]] = await pool.query(
      `SELECT COUNT(*) AS clientCount FROM coach_clients
       WHERE coach_id = ? AND status = 'active'`,
      [req.user.id]
    );

    const [[{ feedbackCount }]] = await pool.query(
      'SELECT COUNT(*) AS feedbackCount FROM coach_feedback WHERE coach_id = ?',
      [req.user.id]
    );

    res.json({ coach, stats: { clientCount, feedbackCount } });
  } catch (err) { next(err); }
});

/* ============================================================
   CLIENTS
   ============================================================ */

router.get('/clients', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.username, u.full_name, u.created_at,
              cc.assigned_at,
              (SELECT COUNT(*) FROM workouts WHERE user_id = u.id) AS workoutCount,
              (SELECT MAX(workout_date) FROM workouts WHERE user_id = u.id) AS lastWorkout,
              (SELECT COUNT(*) FROM coach_feedback
               WHERE coach_id = ? AND client_id = u.id
                 AND read_at IS NULL) AS unreadCount
       FROM coach_clients cc
       JOIN users u ON u.id = cc.client_id
       WHERE cc.coach_id = ? AND cc.status = 'active'
       ORDER BY u.full_name, u.email`,
      [req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/clients/:id', async (req, res, next) => {
  try {
    const clientId = Number(req.params.id);

    const [[assignment]] = await pool.query(
      `SELECT id FROM coach_clients
       WHERE coach_id = ? AND client_id = ? AND status = 'active'`,
      [req.user.id, clientId]
    );
    if (!assignment)
      return res.status(403).json({ error: 'Not assigned to this client' });

    const [[client]] = await pool.query(
      'SELECT id, email, username, full_name, role, created_at FROM users WHERE id = ?',
      [clientId]
    );
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const [[{ workoutCount }]] = await pool.query(
      'SELECT COUNT(*) AS workoutCount FROM workouts WHERE user_id = ?', [clientId]
    );
    const [[{ prCount }]] = await pool.query(
      'SELECT COUNT(*) AS prCount FROM personal_records WHERE user_id = ?', [clientId]
    );
    const [[{ feedbackCount }]] = await pool.query(
      'SELECT COUNT(*) AS feedbackCount FROM coach_feedback WHERE client_id = ?', [clientId]
    );

    const [recentWorkouts] = await pool.query(
      `SELECT id, name, workout_date, notes
       FROM workouts WHERE user_id = ?
       ORDER BY workout_date DESC LIMIT 10`,
      [clientId]
    );

    const [memberships] = await pool.query(
      `SELECT type, status, start_date, end_date FROM memberships
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    );

    const [recentPRs] = await pool.query(
      `SELECT pr.best_1rm, pr.achieved_at, e.name
       FROM personal_records pr
       JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id = ?
       ORDER BY pr.achieved_at DESC LIMIT 5`,
      [clientId]
    );

    res.json({
      client,
      stats: { workoutCount, prCount, feedbackCount },
      membership: memberships[0] || null,
      recentWorkouts,
      recentPRs,
    });
  } catch (err) { next(err); }
});

router.get('/clients/:id/workouts', async (req, res, next) => {
  try {
    const clientId = Number(req.params.id);

    const [[assignment]] = await pool.query(
      `SELECT id FROM coach_clients
       WHERE coach_id = ? AND client_id = ? AND status = 'active'`,
      [req.user.id, clientId]
    );
    if (!assignment)
      return res.status(403).json({ error: 'Not assigned to this client' });

    const [workouts] = await pool.query(
      `SELECT * FROM workouts WHERE user_id = ?
       ORDER BY workout_date DESC LIMIT 50`,
      [clientId]
    );

    if (!workouts.length) return res.json([]);

    const ids = workouts.map(w => w.id);
    const [sets] = await pool.query(
      `SELECT ws.*, e.name AS exercise_name, e.muscle_group
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE ws.workout_id IN (?)`,
      [ids]
    );

    const grouped = {};
    sets.forEach(s => {
      grouped[s.workout_id] = grouped[s.workout_id] || [];
      grouped[s.workout_id].push(s);
    });

    res.json(workouts.map(w => ({ ...w, sets: grouped[w.id] || [] })));
  } catch (err) { next(err); }
});

/* ============================================================
   FEEDBACK
   ============================================================ */

router.post('/feedback', async (req, res, next) => {
  try {
    const { clientId, workoutId, subject, content, rating } = req.body;
    if (!clientId || !content)
      return res.status(400).json({ error: 'clientId and content required' });

    const [[assignment]] = await pool.query(
      `SELECT id FROM coach_clients
       WHERE coach_id = ? AND client_id = ? AND status = 'active'`,
      [req.user.id, clientId]
    );
    if (!assignment)
      return res.status(403).json({ error: 'Not assigned to this client' });

    const [result] = await pool.query(
      `INSERT INTO coach_feedback
        (coach_id, client_id, workout_id, subject, content, rating)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        clientId,
        workoutId || null,
        subject || null,
        content,
        rating != null ? Number(rating) : null,
      ]
    );

    await logActivity({
      userId: req.user.id,
      action: 'coach_feedback_sent',
      req,
      metadata: { clientId, subject },
    });

    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
});

router.get('/feedback', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cf.*, u.full_name AS client_name, u.email AS client_email,
              w.name AS workout_name, w.workout_date
       FROM coach_feedback cf
       JOIN users u ON u.id = cf.client_id
       LEFT JOIN workouts w ON w.id = cf.workout_id
       WHERE cf.coach_id = ?
       ORDER BY cf.created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/clients/:id/feedback', async (req, res, next) => {
  try {
    const clientId = Number(req.params.id);

    const [[assignment]] = await pool.query(
      `SELECT id FROM coach_clients
       WHERE coach_id = ? AND client_id = ? AND status = 'active'`,
      [req.user.id, clientId]
    );
    if (!assignment)
      return res.status(403).json({ error: 'Not assigned to this client' });

    const [rows] = await pool.query(
      `SELECT cf.*, w.name AS workout_name, w.workout_date
       FROM coach_feedback cf
       LEFT JOIN workouts w ON w.id = cf.workout_id
       WHERE cf.coach_id = ? AND cf.client_id = ?
       ORDER BY cf.created_at DESC LIMIT 50`,
      [req.user.id, clientId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.delete('/feedback/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM coach_feedback WHERE id = ? AND coach_id = ?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: 'Feedback not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;