const express = require('express');
const pool = require('../db/mysql');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const [coaches] = await pool.query(
      `SELECT u.id, u.email, u.username, u.full_name,
              cc.assigned_at
       FROM coach_clients cc
       JOIN users u ON u.id = cc.coach_id
       WHERE cc.client_id = ? AND cc.status = 'active'`,
      [req.user.id]
    );

    const [[{ unread }]] = await pool.query(
      `SELECT COUNT(*) AS unread FROM coach_feedback
       WHERE client_id = ? AND read_at IS NULL`,
      [req.user.id]
    );

    res.json({ coaches, unreadCount: unread });
  } catch (err) { next(err); }
});

router.get('/feedback', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cf.*,
              u.full_name AS coach_name, u.email AS coach_email,
              w.name AS workout_name, w.workout_date
       FROM coach_feedback cf
       JOIN users u ON u.id = cf.coach_id
       LEFT JOIN workouts w ON w.id = cf.workout_id
       WHERE cf.client_id = ?
       ORDER BY cf.created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/feedback/:id/read', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `UPDATE coach_feedback SET read_at = NOW()
       WHERE id = ? AND client_id = ? AND read_at IS NULL`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true, changed: result.affectedRows });
  } catch (err) { next(err); }
});

router.patch('/feedback/read-all', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `UPDATE coach_feedback SET read_at = NOW()
       WHERE client_id = ? AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ ok: true, changed: result.affectedRows });
  } catch (err) { next(err); }
});

module.exports = router;