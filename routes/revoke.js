const express = require('express');
const pool = require('../db/mysql');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();

/* Public — check if the token is valid + return user + deadline */
router.get('/:token', async (req, res, next) => {
  try {
    const [[user]] = await pool.query(
      `SELECT id, email, full_name, pending_deletion_at, deletion_reason
       FROM users WHERE deletion_token = ?`,
      [req.params.token]
    );
    if (!user) return res.status(404).json({ error: 'Invalid or expired link' });
    if (!user.pending_deletion_at)
      return res.status(400).json({ error: 'Account is not scheduled for deletion' });

    res.json({
      email: user.email,
      full_name: user.full_name,
      scheduled_for: user.pending_deletion_at,
      reason: user.deletion_reason,
    });
  } catch (err) { next(err); }
});

/* Public — revoke the deletion */
router.post('/:token/confirm', async (req, res, next) => {
  try {
    const [[user]] = await pool.query(
      'SELECT id, email FROM users WHERE deletion_token = ?', [req.params.token]
    );
    if (!user) return res.status(404).json({ error: 'Invalid or expired link' });

    await pool.query(
      `UPDATE users
       SET pending_deletion_at = NULL,
           deletion_token = NULL,
           deletion_reason = NULL
       WHERE id = ?`,
      [user.id]
    );

    await logActivity({
      userId: user.id, action: 'deletion_revoked', req,
      metadata: { email: user.email },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
