const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');
const pool = require('../db/mysql');
const PaymentLog = require('../models/mongo/PaymentLog');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');
const {
  parseEmails,
  sendPaymentVerificationEmail,
} = require('../services/mailer');

const router = express.Router();

/* ---------- helper: build QR + send verification email ---------- */
async function emailVerificationFor(payment, additionalTo = []) {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-payment/${payment.reference}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const [userRows] = await pool.query(
    'SELECT email FROM users WHERE id = ?',
    [payment.userId]
  );
  if (!userRows.length) throw new Error('User not found');

  const extras = parseEmails(additionalTo);
  const recipients = [...new Set([
    userRows[0].email.toLowerCase(),
    ...extras,
  ])];

  await sendPaymentVerificationEmail({
    to: userRows[0].email,
    additionalTo: extras,
    qrDataUrl,
    reference: payment.reference,
    amount: payment.amount,
    method: payment.method,
    purpose: payment.purpose,
    itemName: payment.details?.items?.find(i => i.label === 'Item')?.value,
  });

  return { sentTo: userRows[0].email, additional: extras, recipients };
}

/* ============================================================
   POST /api/payments
   ============================================================ */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { amount, method, purpose, referenceId, details, sendTo } = req.body;
    if (!amount || !method || !purpose)
      return res.status(400).json({ error: 'amount, method, purpose required' });

    const needsVerification = ['gcash', 'maya', 'bank'].includes(method);

    const reference = `PAY-${Date.now().toString(36).toUpperCase()}${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
    const verificationToken = needsVerification
      ? crypto.randomBytes(16).toString('hex')
      : null;

    const payment = await PaymentLog.create({
      userId: req.user.id,
      amount,
      method,
      purpose,
      referenceId,
      reference,
      details: details || {},
      status: needsVerification ? 'pending' : 'paid',
      verificationToken,
    });

    // Instant activation for cash/card
    if (!needsVerification && purpose === 'membership' && referenceId) {
      await pool.query(
        `UPDATE memberships SET status='active' WHERE id=? AND user_id=?`,
        [referenceId, req.user.id]
      );
    }

    // ✅ Send receipt immediately if payment is instantly paid (cash/card)
    if (!needsVerification) {
      try {
        const { sendPaymentReceiptEmail } = require('../services/mailer');
        const [rows] = await pool.query(
          'SELECT email, full_name, username FROM users WHERE id=?', 
          [req.user.id]
        );
        if (rows.length) {
          const user = rows[0];
          sendPaymentReceiptEmail({
            to: user.email,
            userName: user.full_name || user.username,
            reference: payment.reference,
            amount: payment.amount,
            method: payment.method,
            purpose: payment.purpose,
            date: new Date(),
            itemName: payment.details?.items?.find(i => i.label === 'Item')?.value,
          }).catch(err => console.error('Receipt email failed:', err.message));
        }
      } catch (e) {
        console.error('Receipt email failed:', e.message);
      }
    }

    // Email for methods needing verification — fire-and-forget
    if (needsVerification) {
      emailVerificationFor(payment, parseEmails(sendTo))
        .then(() => console.log(`[mailer] ✅ QR emailed for ${payment.reference}`))
        .catch(err => console.error(`[mailer] ❌ Email failed for ${payment.reference}:`, err.message));
    }

    await logActivity({
      userId: req.user.id,
      action: 'payment',
      req,
      metadata: { amount, method, purpose, status: payment.status },
    });

    res.status(201).json(payment);
  } catch (err) { next(err); }
});

/* ============================================================
   GET /api/payments/verify/:reference (public)
   ============================================================ */
router.get('/verify/:reference', async (req, res, next) => {
  try {
    const payment = await PaymentLog.findOne({ reference: req.params.reference }).lean();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const [userRows] = await pool.query(
      'SELECT email, full_name FROM users WHERE id = ?',
      [payment.userId]
    );

    res.json({
      payment,
      user: userRows[0] || { email: '—', full_name: '—' },
      reference: req.params.reference,
    });
  } catch (err) { next(err); }
});

/* ============================================================
   PATCH /api/payments/:id/confirm
   ============================================================ */
router.patch('/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const payment = await PaymentLog.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.userId !== req.user.id)
      return res.status(403).json({ error: 'Not your payment' });
    if (payment.status !== 'pending')
      return res.status(400).json({ error: 'Payment is not pending' });

    payment.details = { ...(payment.details || {}), userConfirmedAt: new Date() };
    await payment.save();

    await logActivity({
      userId: req.user.id,
      action: 'payment_user_confirmed',
      req,
      metadata: { reference: payment.reference, amount: payment.amount },
    });

    res.json({ ok: true, payment });
  } catch (err) { next(err); }
});

/* ============================================================
   POST /api/payments/:id/resend-email
   ============================================================ */
router.post('/:id/resend-email', authenticate, async (req, res, next) => {
  try {
    const { sendTo } = req.body;
    const payment = await PaymentLog.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.userId !== req.user.id)
      return res.status(403).json({ error: 'Not your payment' });
    if (payment.status !== 'pending')
      return res.status(400).json({ error: 'Only pending payments can be resent' });

    const result = await emailVerificationFor(payment, parseEmails(sendTo));
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Resend failed:', err);
    res.status(500).json({ error: err.message || 'Send failed' });
  }
});

/* ============================================================
   GET /api/payments/me (User's own transaction history)
   ============================================================ */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    // 1. Get standard payments from MongoDB
    const mongoPayments = await PaymentLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 }).lean();

    // 2. Get coach payments from MySQL
    let coachPayments = [];
    try {
      const [rows] = await pool.query(
        `SELECT cp.*, c.full_name AS coach_name 
         FROM coach_payments cp
         JOIN users c ON c.id = cp.coach_id
         WHERE cp.member_id = ?`,
        [req.user.id]
      );
      coachPayments = rows;
    } catch (sqlError) {
      console.error("⚠️ Coach payments table missing or error:", sqlError.message);
    }

    // 3. Get Memberships from MySQL (Fallback if PaymentLog is missing)
    let userMemberships = [];
    try {
      const [rows] = await pool.query(
        `SELECT * FROM memberships WHERE user_id = ?`,
        [req.user.id]
      );
      userMemberships = rows;
    } catch (sqlError) {
      console.error("⚠️ Memberships table error:", sqlError.message);
    }

    // 4. Format everything into a unified list
    const formattedMongo = mongoPayments.map(p => ({
      id: p._id.toString(),
      reference: p.reference,
      amount: Number(p.amount || 0),
      method: p.method,
      purpose: p.purpose,
      status: p.status,
      date: p.createdAt,
      details: p.details,
      source: 'system'
    }));

    const formattedCoach = coachPayments.map(p => ({
      id: `coach-${p.id}`,
      reference: p.reference || `COACH-${p.id}`,
      amount: Number(p.amount || 0),
      method: p.method || 'cash',
      purpose: 'coach_payment',
      status: p.status,
      date: p.created_at,
      details: { coachName: p.coach_name, hours: p.hours, rate: p.rate },
      source: 'coach'
    }));

    // Format memberships that don't have a corresponding PaymentLog
    const formattedMemberships = userMemberships
      .filter(m => !mongoPayments.some(p => p.purpose === 'membership' && p.referenceId === m.id)) // Avoid duplicates
      .map(m => ({
        id: `mem-${m.id}`,
        reference: `MEM-${m.id.toString().padStart(5, '0')}`,
        amount: 0, // Unknown price here, so put 0 to avoid double counting
        method: 'walk-in', 
        purpose: 'membership',
        status: m.status,
        date: m.created_at || m.start_date,
        details: { type: m.type },
        source: 'membership'
      }));

    // 5. Combine and sort by date (newest first)
    const allTransactions = [...formattedMongo, ...formattedCoach, ...formattedMemberships].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // 6. Calculate total spent (only count successful payments from MongoDB and Coach payments)
    const totalSpent = [...formattedMongo, ...formattedCoach]
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      transactions: allTransactions,
      totalSpent,
      count: allTransactions.length,
    });
  } catch (err) { next(err); }
});

/* ============================================================
   GET /api/payments (admin)
   ============================================================ */
router.get('/', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const list = await PaymentLog.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json(list);
  } catch (err) { next(err); }
});

module.exports = router;
