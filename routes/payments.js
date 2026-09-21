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

    // Email for methods needing verification
    if (needsVerification) {
      try {
        await emailVerificationFor(payment, parseEmails(sendTo));
      } catch (mailErr) {
        console.error('⚠️  Email send failed:', mailErr.message);
      }
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
   GET /api/payments/me
   ============================================================ */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const list = await PaymentLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json(list);
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