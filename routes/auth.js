const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/mysql');
const { logActivity } = require('../services/activityLogger');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const signToken = (u) =>
  jwt.sign(
    { id: u.id, email: u.email, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/* ---------- POST /api/auth/register ---------- */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name, username, birthday } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const [dup] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (dup.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, birthday)
       VALUES (?, ?, ?, ?, 'user', ?)`,
      [
        username || email.split('@')[0],
        email,
        hash,
        full_name || null,
        birthday || null,
      ]
    );

    const user = { id: result.insertId, email, role: 'user', full_name };
    await logActivity({ userId: user.id, action: 'register', req });

    res.status(201).json({ token: signToken(user), user });
  } catch (err) { next(err); }
});

/* ---------- POST /api/auth/login ---------- */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const [rows] = await pool.query(
      'SELECT id, email, password_hash, role, full_name FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const u = rows[0];
    if (!u.password_hash)
      return res.status(401).json({ error: 'Account not configured for password login' });

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const user = { id: u.id, email: u.email, role: u.role, full_name: u.full_name };
    await logActivity({ userId: user.id, action: 'login', req });

    res.json({ token: signToken(user), user });
  } catch (err) { next(err); }
});

/* ---------- GET /api/auth/me ---------- */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, role, full_name, username, created_at, birthday
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
    if (birthday  !== undefined) { fields.push('birthday = ?');  params.push(birthday || null); }

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
      `SELECT id, email, role, full_name, username, created_at, birthday
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