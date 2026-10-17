const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');
const pool = require('../db/mysql');
const PaymentLog = require('../models/mongo/PaymentLog');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');
const { isPaymentMethod, MEMBERSHIP_PRICES } = require('../services/paymentPolicy');
const { buildClientUrl } = require('../services/clientUrl');
const {
  parseEmails,
  sendPaymentVerificationEmail,
} = require('../services/mailer');

const router = express.Router();

/* ---------- helper: build QR + send verification email ---------- */
async function emailVerificationFor(payment, additionalTo = []) {
  const verifyUrl = buildClientUrl(`/verify-payment/${payment.reference}`);
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
    const { method, purpose, referenceId, sendTo } = req.body;
    if (!isPaymentMethod(method))
      return res.status(400).json({ error: 'Invalid payment method' });
    if (!['membership', 'rental'].includes(purpose))
      return res.status(400).json({ error: 'Invalid payment purpose' });

    const linkedId = Number(referenceId);
    if (!Number.isSafeInteger(linkedId) || linkedId < 1)
      return res.status(400).json({ error: 'A valid referenceId is required' });

    let amount;
    let details;
    if (purpose === 'membership') {
      const [[membership]] = await pool.query(
        `SELECT id, type, start_date, end_date
         FROM memberships
         WHERE id = ? AND user_id = ? AND status = 'pending'`,
        [linkedId, req.user.id]
      );
      if (!membership)
        return res.status(404).json({ error: 'Pending membership not found' });

      amount = MEMBERSHIP_PRICES[membership.type];
      if (amount == null)
        return res.status(400).json({ error: 'Unsupported membership type' });
      details = {
        items: [
          { label: 'Plan', value: membership.type },
          { label: 'Duration', value: `${membership.start_date} → ${membership.end_date}` },
        ],
      };
    } else {
      const [[rental]] = await pool.query(
        `SELECT r.id, r.quantity, r.start_time, r.end_time, r.total_cost,
                i.name AS item_name, i.hourly_rate
         FROM rentals r
         JOIN rental_items i ON i.id = r.item_id
         WHERE r.id = ? AND r.user_id = ? AND r.status = 'reserved'`,
        [linkedId, req.user.id]
      );
      if (!rental)
        return res.status(404).json({ error: 'Reserved rental not found' });

      amount = Number(rental.total_cost);
      if (!Number.isFinite(amount) || amount <= 0)
        return res.status(400).json({ error: 'Rental has an invalid total' });
      const hours = Math.max(
        1,
        Math.ceil((new Date(rental.end_time) - new Date(rental.start_time)) / 3_600_000)
      );
      details = {
        items: [
          { label: 'Item', value: rental.item_name },
          { label: 'Quantity', value: rental.quantity },
          { label: 'Duration', value: `${hours} hour${hours === 1 ? '' : 's'}` },
          { label: 'Rate', value: `PHP ${Number(rental.hourly_rate).toFixed(2)}/hr` },
        ],
      };
    }

    const existingPayment = await PaymentLog.findOne({
      userId: req.user.id,
      purpose,
      referenceId: linkedId,
      status: { $in: ['pending', 'paid'] },
    }).lean();
    if (existingPayment)
      return res.status(409).json({ error: 'A payment already exists for this purchase' });

    const reference = `PAY-${Date.now().toString(36).toUpperCase()}${crypto
      .randomBytes(16)
      .toString('hex')
      .toUpperCase()}`;
    const payment = await PaymentLog.create({
      userId: req.user.id,
      amount,
      method,
      purpose,
      referenceId: linkedId,
      reference,
      details,
      status: 'pending',
    });

    emailVerificationFor(payment, parseEmails(sendTo))
      .then(() => console.log(`[mailer] ✅ QR emailed for ${payment.reference}`))
      .catch(err => console.error(`[mailer] ❌ Email failed for ${payment.reference}:`, err.message));

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
    const payment = await PaymentLog.findOne({ reference: req.params.reference })
      .select('_id amount method purpose reference status details createdAt')
      .lean();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    res.json({ payment });
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

    // 3. Format actual payment records into a unified list.
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

    // Membership state is exposed separately by /api/memberships/me; it is not a payment record.
    const allTransactions = [...formattedMongo, ...formattedCoach].sort(
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
