const express = require('express');
const pool = require('../db/mysql');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/* POST /api/memberships */
router.post('/', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { type, start_date } = req.body;
    if (!['walk-in', 'monthly', 'yearly'].includes(type))
      throw Object.assign(new Error('Invalid membership type'), { status: 400 });

    const start = new Date(start_date || Date.now());
    const end = new Date(start);
    if (type === 'walk-in') end.setDate(end.getDate() + 1);
    if (type === 'monthly') end.setMonth(end.getMonth() + 1);
    if (type === 'yearly')  end.setFullYear(end.getFullYear() + 1);

    // cancel active ones
    await conn.query(
      `UPDATE memberships SET status='cancelled'
       WHERE user_id=? AND status='active'`,
      [req.user.id]
    );

    const [r] = await conn.query(
      `INSERT INTO memberships (user_id, type, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [req.user.id, type,
       start.toISOString().slice(0, 10),
       end.toISOString().slice(0, 10)]
    );

    await conn.commit();
    res.status(201).json({
      id: r.insertId, type,
      start_date: start.toISOString().slice(0, 10),
      end_date:   end.toISOString().slice(0, 10),
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
});

/* GET /api/memberships/me */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM memberships WHERE user_id=? ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/memberships (admin) */
router.get('/', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, u.email
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;