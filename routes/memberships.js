const express = require('express');
const pool = require('../db/mysql');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');
const { isPaymentMethod, MEMBERSHIP_PRICES } = require('../services/paymentPolicy');

const router = express.Router();

/* POST /api/memberships */
router.post('/', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { type, paymentMethod } = req.body;
    if (!Object.hasOwn(MEMBERSHIP_PRICES, type))
      throw Object.assign(new Error('Invalid membership type'), { status: 400 });
    if (!isPaymentMethod(paymentMethod))
      throw Object.assign(new Error('Invalid payment method'), { status: 400 });

    const start = new Date();
    const end = new Date(start);
    if (type === 'walk-in') end.setDate(end.getDate() + 1);
    if (type === 'monthly') end.setMonth(end.getMonth() + 1);
    if (type === 'yearly')  end.setFullYear(end.getFullYear() + 1);

    const [r] = await conn.query(
      `INSERT INTO memberships (user_id, type, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, type,
       start.toISOString().slice(0, 10),
       end.toISOString().slice(0, 10),
       'pending']
    );

    await conn.commit();

    await logActivity({
      userId: req.user.id,
      action: 'membership_created',
      req,
      metadata: { type, status: 'pending', paymentMethod },
    });

    res.status(201).json({
      id: r.insertId,
      type,
      status: 'pending',
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
