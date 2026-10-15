const express = require('express');
const pool = require('../db/mysql');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/* ---------- Coach connection ---------- */

router.get('/', async (req, res, next) => {
  try {
    const [coaches] = await pool.query(
      `SELECT u.id, u.email, u.username, u.full_name, cc.assigned_at
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

    const [pendingRequests] = await pool.query(
      `SELECT cr.id, cr.status, cr.message, cr.created_at,
              u.id AS coach_id, u.full_name AS coach_name, u.email AS coach_email
       FROM coach_requests cr
       LEFT JOIN users u ON u.id = cr.coach_id
       WHERE cr.member_id = ? AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [req.user.id]
    );

    res.json({ coaches, unreadCount: unread, pendingRequests });
  } catch (err) { next(err); }
});

/* ---------- Request a coach ---------- */

router.post('/request', async (req, res, next) => {
  try {
    const { message } = req.body;

    const [[existing]] = await pool.query(
      `SELECT id FROM coach_clients WHERE client_id = ? AND status = 'active'`,
      [req.user.id]
    );
    if (existing) return res.status(400).json({ error: 'You already have a coach assigned' });

    const [[pending]] = await pool.query(
      `SELECT id FROM coach_requests WHERE member_id = ? AND status = 'pending'`,
      [req.user.id]
    );
    if (pending) return res.status(400).json({ error: 'You already have a pending request' });

    const [r] = await pool.query(
      `INSERT INTO coach_requests (member_id, message) VALUES (?, ?)`,
      [req.user.id, message || null]
    );

    res.status(201).json({ id: r.insertId, status: 'pending' });
  } catch (err) { next(err); }
});

router.delete('/request/:id', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE coach_requests SET status='cancelled'
       WHERE id = ? AND member_id = ? AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ---------- Feedback ---------- */

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

    if (!rows.length) return res.json([]);

    const ids = rows.map(r => r.id);
    const [replies] = await pool.query(
      `SELECT r.*, u.full_name AS author_name, u.role AS author_role
       FROM coach_feedback_replies r
       JOIN users u ON u.id = r.author_id
       WHERE r.feedback_id IN (?)
       ORDER BY r.created_at ASC`,
      [ids]
    );
    const [reactions] = await pool.query(
      `SELECT feedback_id, emoji, COUNT(*) AS count,
              SUM(user_id = ?) AS mine
       FROM coach_feedback_reactions
       WHERE feedback_id IN (?)
       GROUP BY feedback_id, emoji`,
      [req.user.id, ids]
    );

    const repliesMap = {}, reactionsMap = {};
    replies.forEach(r => {
      repliesMap[r.feedback_id] = repliesMap[r.feedback_id] || [];
      repliesMap[r.feedback_id].push(r);
    });
    reactions.forEach(r => {
      reactionsMap[r.feedback_id] = reactionsMap[r.feedback_id] || [];
      reactionsMap[r.feedback_id].push({ emoji: r.emoji, count: Number(r.count), mine: !!Number(r.mine) });
    });

    res.json(rows.map(r => ({
      ...r,
      replies: repliesMap[r.id] || [],
      reactions: reactionsMap[r.id] || [],
    })));
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

router.post('/feedback/:id/replies', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length < 1)
      return res.status(400).json({ error: 'Content required' });

    const [[fb]] = await pool.query(
      'SELECT id FROM coach_feedback WHERE id = ? AND client_id = ?',
      [req.params.id, req.user.id]
    );
    if (!fb) return res.status(403).json({ error: 'Not allowed' });

    const [r] = await pool.query(
      `INSERT INTO coach_feedback_replies (feedback_id, author_id, content)
       VALUES (?, ?, ?)`,
      [req.params.id, req.user.id, content.trim()]
    );

    const [[row]] = await pool.query(
      `SELECT r.*, u.full_name AS author_name, u.role AS author_role
       FROM coach_feedback_replies r
       JOIN users u ON u.id = r.author_id
       WHERE r.id = ?`,
      [r.insertId]
    );

    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.post('/feedback/:id/react', async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji required' });

    const [[fb]] = await pool.query(
      'SELECT id FROM coach_feedback WHERE id = ? AND client_id = ?',
      [req.params.id, req.user.id]
    );
    if (!fb) return res.status(403).json({ error: 'Not allowed' });

    const [existing] = await pool.query(
      `SELECT id FROM coach_feedback_reactions
       WHERE feedback_id = ? AND user_id = ? AND emoji = ?`,
      [req.params.id, req.user.id, emoji]
    );

    if (existing.length) {
      await pool.query('DELETE FROM coach_feedback_reactions WHERE id = ?', [existing[0].id]);
      return res.json({ ok: true, action: 'removed' });
    }

    await pool.query(
      `INSERT INTO coach_feedback_reactions (feedback_id, user_id, emoji)
       VALUES (?, ?, ?)`,
      [req.params.id, req.user.id, emoji]
    );
    res.json({ ok: true, action: 'added' });
  } catch (err) { next(err); }
});

module.exports = router;
