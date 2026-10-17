const express = require('express');
const pool = require('../db/mysql');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');
const { isPaymentMethod } = require('../services/paymentPolicy');

const router = express.Router();

/* GET /api/rentals/items — public catalog */
router.get('/items', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM rental_items ORDER BY category, name'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* POST /api/rentals */
router.post('/', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { item_id, quantity = 1, start_time, end_time, paymentMethod } = req.body;
    if (!item_id || !start_time || !end_time)
      throw Object.assign(new Error('item_id, start_time, end_time required'), { status: 400 });
    if (!Number.isSafeInteger(Number(item_id)) || Number(item_id) < 1)
      throw Object.assign(new Error('Invalid item_id'), { status: 400 });
    if (!Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1)
      throw Object.assign(new Error('Quantity must be a positive integer'), { status: 400 });
    if (!isPaymentMethod(paymentMethod))
      throw Object.assign(new Error('Invalid payment method'), { status: 400 });

    const [[item]] = await conn.query(
      'SELECT * FROM rental_items WHERE id=? FOR UPDATE', [item_id]
    );
    if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
    if (!Number.isFinite(Number(item.hourly_rate)) || Number(item.hourly_rate) <= 0)
      throw Object.assign(new Error('Item has an invalid rental rate'), { status: 400 });
    if (item.stock < Number(quantity))
      throw Object.assign(new Error('Insufficient stock'), { status: 400 });

    const start = new Date(start_time);
    const end   = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start)
      throw Object.assign(new Error('A valid end time after the start time is required'), { status: 400 });
    const hours = Math.max(1, Math.ceil((end - start) / 3_600_000));
    const safeQuantity = Number(quantity);
    const total = Math.round(Number(item.hourly_rate) * hours * safeQuantity * 100) / 100;

    const initialStatus = 'reserved';

    const [r] = await conn.query(
      `INSERT INTO rentals
        (user_id, item_id, quantity, start_time, end_time, status, total_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, item_id, safeQuantity, start, end, initialStatus, total]
    );

    // Reserve stock in both cases
    await conn.query(
      'UPDATE rental_items SET stock = stock - ? WHERE id = ?',
      [safeQuantity, item_id]
    );

    await conn.commit();

    await logActivity({
      userId: req.user.id,
      action: 'rental_created',
      req,
      metadata: { item: item.name, status: initialStatus, paymentMethod },
    });

    res.status(201).json({
      id: r.insertId,
      total_cost: total,
      hours,
      status: initialStatus,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
});

/* POST /api/rentals/:id/return */
router.post('/:id/return', authenticate, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[rental]] = await conn.query(
      'SELECT * FROM rentals WHERE id=? AND user_id=? FOR UPDATE',
      [req.params.id, req.user.id]
    );
    if (!rental) throw Object.assign(new Error('Rental not found'), { status: 404 });
    if (rental.status === 'returned')
      throw Object.assign(new Error('Already returned'), { status: 400 });

    await conn.query(`UPDATE rentals SET status='returned' WHERE id=?`, [rental.id]);
    await conn.query(
      'UPDATE rental_items SET stock = stock + ? WHERE id = ?',
      [rental.quantity, rental.item_id]
    );

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
});

/* GET /api/rentals/me */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, i.name AS item_name
       FROM rentals r
       JOIN rental_items i ON i.id = r.item_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/rentals (admin) */
router.get('/', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, i.name AS item_name, u.email
       FROM rentals r
       JOIN rental_items i ON i.id = r.item_id
       JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
