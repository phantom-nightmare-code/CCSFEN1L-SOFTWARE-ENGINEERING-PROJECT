const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/mysql');
const { logActivity } = require('../services/activityLogger');
const { sendWelcomeVerificationEmail } = require('../services/mailer');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const signToken = (u) =>
  jwt.sign(
    { id: u.id, email: u.email, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

function validateBirthday(birthday) {
  if (!birthday) return null;
  const bd = new Date(birthday);
  if (isNaN(bd)) return 'Invalid birthday format';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bd > today) return 'Birthday cannot be in the future';

  const minAge = new Date();
  minAge.setFullYear(minAge.getFullYear() - 120);
  if (bd < minAge) return 'Please enter a valid birthday';

  const youngest = new Date();
  youngest.setFullYear(youngest.getFullYear() - 13);
  if (bd > youngest) return 'You must be at least 13 years old to register';

  return null;
}

/* ---------- POST /api/auth/register ---------- */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name, username, birthday } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const bdErr = validateBirthday(birthday);
    if (bdErr) return res.status(400).json({ error: bdErr });

    const [dup] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (dup.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);

    // Generate verification token (valid 24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [result] = await pool.query(
      `INSERT INTO users
        (username, email, password_hash, full_name, role, birthday,
         email_verified, verification_token, verification_expires_at)
       VALUES (?, ?, ?, ?, 'user', ?, FALSE, ?, ?)`,
      [
        username || email.split('@')[0],
        email,
        hash,
        full_name || null,
        birthday || null,
        verificationToken,
        expiresAt,
      ]
    );

    const userId = result.insertId;

    await logActivity({
      userId,
      action: 'register',
      req,
      metadata: { email, verified: false },
    });

    // Fire-and-forget welcome email
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    sendWelcomeVerificationEmail({
      to: email,
      fullName: full_name,
      verifyUrl,
    })
      .then(() => console.log(`[auth] Welcome email sent to ${email}`))
      .catch(err => console.error(`[auth] Welcome email failed for ${email}:`, err.message));

    res.status(201).json({
      message: 'Account created. Please check your email to verify.',
      requiresVerification: true,
      email,
    });
  } catch (err) { next(err); }
});

/* ---------- GET /api/auth/verify-email/:token ---------- */
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Missing verification token' });

    const [rows] = await pool.query(
      `SELECT id, email, email_verified, verification_expires_at
       FROM users WHERE verification_token = ?`,
      [token]
    );

    if (!rows.length)
      return res.status(400).json({ error: 'Invalid or already-used verification link' });

    const user = rows[0];

    if (user.email_verified)
      return res.json({ ok: true, alreadyVerified: true, email: user.email });

    if (new Date(user.verification_expires_at) < new Date())
      return res.status(410).json({ error: 'This verification link has expired. Please request a new one.' });

    await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           verification_token = NULL,
           verification_expires_at = NULL
       WHERE id = ?`,
      [user.id]
    );

    await logActivity({
      userId: user.id,
      action: 'email_verified',
      req,
      metadata: { email: user.email },
    });

    res.json({ ok: true, email: user.email });
  } catch (err) { next(err); }
});

/* ---------- POST /api/auth/resend-verification ---------- */
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const [rows] = await pool.query(
      'SELECT id, email, full_name, email_verified FROM users WHERE email = ?',
      [email]
    );

    // Always return success — don't leak which emails are registered
    if (!rows.length) {
      return res.json({ ok: true, message: 'If the account exists and is unverified, an email was sent.' });
    }

    const user = rows[0];
    if (user.email_verified) {
      return res.json({ ok: true, message: 'This account is already verified. You can log in.' });
    }

    // Generate a fresh token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users
       SET verification_token = ?, verification_expires_at = ?
       WHERE id = ?`,
      [verificationToken, expiresAt, user.id]
    );

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    sendWelcomeVerificationEmail({
      to: user.email,
      fullName: user.full_name,
      verifyUrl,
    })
      .then(() => console.log(`[auth] Verification resent to ${user.email}`))
      .catch(err => console.error(`[auth] Resend failed for ${user.email}:`, err.message));

    res.json({ ok: true, message: 'Verification email sent. Check your inbox.' });
  } catch (err) { next(err); }
});

/* ---------- POST /api/auth/login ---------- */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const [rows] = await pool.query(
      'SELECT id, email, password_hash, role, full_name, email_verified FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const u = rows[0];
    if (!u.password_hash)
      return res.status(401).json({ error: 'Account not configured for password login' });

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    if (!u.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        email: u.email,
      });
    }

    const user = { id: u.id, email: u.email, role: u.role, full_name: u.full_name };
    await logActivity({ userId: user.id, action: 'login', req });

    res.json({ token: signToken(user), user });
  } catch (err) { next(err); }
});

/* ---------- GET /api/auth/me ---------- */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, role, full_name, username, created_at, birthday, email_verified
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

/* ---------- PATCH /api/auth/me ---------- */
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { full_name, username, birthday } = req.body;
    const fields = [];
    const params = [];

    if (full_name !== undefined) { fields.push('full_name = ?'); params.push(full_name || null); }
    if (username  !== undefined) { fields.push('username = ?');  params.push(username); }

    if (birthday !== undefined) {
      const bdErr = validateBirthday(birthday);
      if (bdErr) return res.status(400).json({ error: bdErr });
      fields.push('birthday = ?');
      params.push(birthday || null);
    }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    if (username) {
      const [dup] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id <> ?',
        [username, req.user.id]
      );
      if (dup.length) return res.status(409).json({ error: 'Username already taken' });
    }

    params.push(req.user.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query(
      `SELECT id, email, role, full_name, username, created_at, birthday, email_verified
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    await logActivity({
      userId: req.user.id,
      action: 'profile_updated',
      req,
      metadata: { fields: fields.map(f => f.split(' ')[0]) },
    });

    res.json({ ok: true, user: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
