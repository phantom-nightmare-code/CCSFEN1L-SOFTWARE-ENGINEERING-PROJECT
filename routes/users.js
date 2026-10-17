const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

function canAccessUser(req, userId) {
  return req.user.role === 'admin' || Number(req.user.id) === Number(userId);
}

router.get('/:id', async (req, res, next) => {
  if (!canAccessUser(req, req.params.id))
    return res.status(403).json({ error: 'Access denied' });

  try {
    const [rows] = await pool.query(
      `SELECT id, username, full_name, email, role, experience_years, expertise, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/coach-details', async (req, res, next) => {
  if (!canAccessUser(req, req.params.id))
    return res.status(403).json({ error: 'Access denied' });

  const { full_name, experience_years, expertise } = req.body;
  const isCoach = req.user.role === 'coach';
  const canUpdateCoachDetails = isCoach || req.user.role === 'admin';

  if (typeof full_name !== 'string' || !full_name.trim())
    return res.status(400).json({ error: 'A valid full name is required' });
  if (full_name.trim().length > 255)
    return res.status(400).json({ error: 'Full name must be at most 255 characters' });

  let years = null;
  if (canUpdateCoachDetails) {
    years = Number(experience_years);
    if (!Number.isInteger(years) || years < 0 || years > 80)
      return res.status(400).json({ error: 'Experience years must be an integer from 0 to 80' });
    if (typeof expertise !== 'string' || expertise.length > 500)
      return res.status(400).json({ error: 'Expertise must be a string of at most 500 characters' });
  }

  try {
    const [[existingUser]] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!existingUser)
      return res.status(404).json({ error: 'User not found' });
    if (canUpdateCoachDetails && req.user.role !== 'admin' && existingUser.role !== 'coach')
      return res.status(403).json({ error: 'Coach profile access required' });

    if (canUpdateCoachDetails) {
      await pool.query(
          `UPDATE users SET full_name = ?, experience_years = ?, expertise = ?
           WHERE id = ?`,
          [full_name.trim(), years, expertise.trim() || null, req.params.id]
        );
    } else {
      await pool.query(
          'UPDATE users SET full_name = ? WHERE id = ?',
          [full_name.trim(), req.params.id]
        );
    }

    res.json({ ok: true, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
