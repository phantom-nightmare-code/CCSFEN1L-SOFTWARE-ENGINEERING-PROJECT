const express = require('express');
const crypto = require('crypto');
const pool = require('../db/mysql');
const { authenticate, requireCoach } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();
router.use(authenticate);

/* ============================================================
   PUBLIC COACHES (member sees these)
   ============================================================ */

router.get('/available', async (req, res, next) => {
  try {
    const [coaches] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email,
              u.coach_hourly_rate,
              AVG(cf.rating) AS avg_rating,
              COUNT(cf.rating) AS review_count
       FROM users u
       LEFT JOIN coach_feedback cf
         ON cf.coach_id = u.id AND cf.rating IS NOT NULL
       WHERE u.role = 'coach'
       GROUP BY u.id
       ORDER BY avg_rating DESC, u.full_name`
    );

    res.json(coaches.map(c => ({
      id: c.id,
      full_name: c.full_name || c.username || c.email,
      email: c.email,
      hourly_rate: c.coach_hourly_rate != null ? Number(c.coach_hourly_rate) : null,
      avg_rating: c.avg_rating ? Number(c.avg_rating).toFixed(1) : null,
      review_count: Number(c.review_count || 0),
    })));
  } catch (err) { next(err); }
});

/* ============================================================
   MEMBER → PAY COACH
   ============================================================ */

router.post('/', async (req, res, next) => {
  try {
    const { coachId, hours, method, session_date, notes } = req.body;
    if (!coachId || !hours) return res.status(400).json({ error: 'coachId and hours required' });

    const hoursNum = Number(hours);
    if (!hoursNum || hoursNum <= 0) return res.status(400).json({ error: 'Invalid hours' });

    // Verify the coach exists and has a rate
    const [[coach]] = await pool.query(
      `SELECT id, full_name, username, email, coach_hourly_rate
       FROM users WHERE id = ? AND role = 'coach'`,
      [coachId]
    );
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    if (coach.coach_hourly_rate == null)
      return res.status(400).json({ error: 'Coach has not set an hourly rate yet' });

    const rate = Number(coach.coach_hourly_rate);
    const amount = rate * hoursNum;

    const reference = `COACH-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const [result] = await pool.query(
      `INSERT INTO coach_payments
        (member_id, coach_id, hours, rate, amount, method, status, session_date, notes, reference)
       VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?)`,
      [req.user.id, coachId, hoursNum, rate, amount,
       method || 'cash', session_date || null, notes || null, reference]
    );

    await logActivity({
      userId: req.user.id,
      action: 'coach_payment_made',
      req,
      metadata: { coachId, hours: hoursNum, amount, method },
    });

    res.status(201).json({
      id: result.insertId,
      reference,
      amount,
      rate,
      hours: hoursNum,
      coach: { id: coach.id, name: coach.full_name || coach.username },
    });
  } catch (err) { next(err); }
});

/* ============================================================
   MEMBER's own payments to coaches
   ============================================================ */

router.get('/me', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*,
              u.full_name AS coach_name, u.username AS coach_username, u.email AS coach_email
       FROM coach_payments cp
       JOIN users u ON u.id = cp.coach_id
       WHERE cp.member_id = ?
       ORDER BY cp.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ============================================================
   COACH's received payments
   ============================================================ */

router.get('/received', requireCoach, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*,
              u.full_name AS member_name, u.username AS member_username, u.email AS member_email
       FROM coach_payments cp
       JOIN users u ON u.id = cp.member_id
       WHERE cp.coach_id = ?
       ORDER BY cp.created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ============================================================
   COACH sets their own rate
   ============================================================ */

router.patch('/my-rate', requireCoach, async (req, res, next) => {
  try {
    const { hourly_rate } = req.body;
    const rate = hourly_rate === '' || hourly_rate == null ? null : Number(hourly_rate);

    if (rate != null && (isNaN(rate) || rate < 0 || rate > 100000))
      return res.status(400).json({ error: 'Invalid hourly rate' });

    await pool.query(
      'UPDATE users SET coach_hourly_rate = ? WHERE id = ?',
      [rate, req.user.id]
    );

    await logActivity({
      userId: req.user.id,
      action: 'coach_rate_updated',
      req,
      metadata: { hourly_rate: rate },
    });

    res.json({ ok: true, hourly_rate: rate });
  } catch (err) { next(err); }
});

module.exports = router;
