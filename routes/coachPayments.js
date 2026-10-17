const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const pool = require('../db/mysql');
const { authenticate, requireCoach } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');
const { sendCoachPaymentEmail } = require('../services/mailer');
const { isPaymentMethod } = require('../services/paymentPolicy');

const router = express.Router();
router.use(authenticate);

/* ============================================================
   PUBLIC COACHES
   ============================================================ */

router.get('/available', async (req, res, next) => {
  try {
    const [coaches] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email,
              u.coach_hourly_rate,
              AVG(cr.rating) AS avg_rating,
              COUNT(cr.rating) AS review_count
       FROM users u
       LEFT JOIN coach_ratings cr ON cr.coach_id = u.id
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
   MEMBER → RATE COACH
   ============================================================ */

router.post('/rate', async (req, res, next) => {
  try {
    const { coachId, rating, review } = req.body;
    if (!coachId || !rating)
      return res.status(400).json({ error: 'coachId and rating required' });
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)
      return res.status(400).json({ error: 'Rating must be 1-5' });
    if (Number(coachId) === req.user.id)
      return res.status(400).json({ error: 'You cannot rate yourself' });

    const [[coach]] = await pool.query(
      `SELECT id FROM users WHERE id = ? AND role = 'coach'`, [coachId]
    );
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    await pool.query(
      `INSERT INTO coach_ratings (coach_id, member_id, rating, review)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review)`,
      [coachId, req.user.id, ratingNum, review || null]
    );

    await logActivity({
      userId: req.user.id, action: 'coach_rated', req,
      metadata: { coachId, rating: ratingNum },
    });

    res.json({ ok: true, rating: ratingNum });
  } catch (err) { next(err); }
});

router.get('/my-rating/:coachId', async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT id, rating, review, created_at, updated_at
       FROM coach_ratings WHERE coach_id = ? AND member_id = ?`,
      [req.params.coachId, req.user.id]
    );
    res.json(row || null);
  } catch (err) { next(err); }
});

router.delete('/my-rating/:coachId', async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM coach_ratings WHERE coach_id = ? AND member_id = ?`,
      [req.params.coachId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/ratings/:coachId', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cr.id, cr.rating, cr.review, cr.created_at,
              u.full_name AS member_name, u.username AS member_username
       FROM coach_ratings cr
       JOIN users u ON u.id = cr.member_id
       WHERE cr.coach_id = ?
       ORDER BY cr.created_at DESC LIMIT 50`,
      [req.params.coachId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ============================================================
   MEMBER → PAY COACH
   Cash/Card = instant paid. GCash/Maya/Bank = pending + QR email.
   ============================================================ */

router.post('/', async (req, res, next) => {
  try {
    const { coachId, hours, method, session_date, notes } = req.body;
    if (!coachId || !hours)
      return res.status(400).json({ error: 'coachId and hours required' });

    const hoursNum = Number(hours);
    if (!Number.isFinite(hoursNum) || hoursNum <= 0 || hoursNum > 24)
      return res.status(400).json({ error: 'Invalid hours' });
    if (!isPaymentMethod(method || 'cash'))
      return res.status(400).json({ error: 'Invalid payment method' });
    if (!Number.isSafeInteger(Number(coachId)) || Number(coachId) === req.user.id)
      return res.status(400).json({ error: 'Invalid coach' });

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
    const method_ = method || 'cash';

    const reference = `COACH-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const [result] = await pool.query(
      `INSERT INTO coach_payments
        (member_id, coach_id, hours, rate, amount, method, status, session_date, notes, reference, verification_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, coachId, hoursNum, rate, amount, method_,
       'pending',
       session_date || null, notes || null, reference, verificationToken]
    );

    const receiptText = [
      'FitForge Coach Payment',
      `Reference: ${reference}`,
      `Coach: ${coach.full_name || coach.username}`,
      `Amount: PHP ${amount.toFixed(2)}`,
      `Method: ${method_.toUpperCase()}`,
      `Hours: ${hoursNum} × PHP ${rate.toFixed(2)}/hr`,
      session_date ? `Session: ${session_date}` : '',
    ].filter(Boolean).join('\n');

    const qrDataUrl = await QRCode.toDataURL(receiptText, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const [memberRows] = await pool.query(
      'SELECT email, full_name FROM users WHERE id = ?', [req.user.id]
    );
    if (memberRows.length) {
      sendCoachPaymentEmail({
        to: memberRows[0].email,
        memberName: memberRows[0].full_name,
        coachName: coach.full_name || coach.username,
        reference, amount, rate, hours: hoursNum,
        method: method_,
        sessionDate: session_date || null,
        notes: notes || null,
        qrDataUrl,
      }).catch(err => console.error('[coach-pay] Email failed:', err.message));
    }

    await logActivity({
      userId: req.user.id, action: 'coach_payment_made', req,
      metadata: { coachId, hours: hoursNum, amount, method: method_, status: 'pending' },
    });

    res.status(201).json({
      id: result.insertId,
      reference, amount, rate,
      hours: hoursNum,
      status: 'pending',
      qrDataUrl,
      coach: { id: coach.id, name: coach.full_name || coach.username },
    });
  } catch (err) { next(err); }
});

/* Member confirms they sent the money */
router.patch('/:id/confirm', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `UPDATE coach_payments
       SET user_confirmed_at = NOW()
       WHERE id = ? AND member_id = ? AND status = 'pending' AND user_confirmed_at IS NULL`,
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows)
      return res.status(400).json({ error: 'Already confirmed or not pending' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* Coach marks the payment as received */
router.patch('/:id/verify', requireCoach, async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `UPDATE coach_payments
       SET status = 'paid', verified_at = NOW()
       WHERE id = ? AND coach_id = ? AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows)
      return res.status(400).json({ error: 'Not pending or not yours' });

    await logActivity({
      userId: req.user.id, action: 'coach_payment_verified', req,
      metadata: { paymentId: req.params.id },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch('/:id/reject', requireCoach, async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `UPDATE coach_payments
       SET status = 'refunded'
       WHERE id = ? AND coach_id = ? AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows)
      return res.status(400).json({ error: 'Not pending or not yours' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ============================================================
   QUERIES
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
      userId: req.user.id, action: 'coach_rate_updated', req,
      metadata: { hourly_rate: rate },
    });

    res.json({ ok: true, hourly_rate: rate });
  } catch (err) { next(err); }
});

module.exports = router;
