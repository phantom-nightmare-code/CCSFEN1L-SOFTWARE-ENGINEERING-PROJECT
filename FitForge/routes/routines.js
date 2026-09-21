const express = require('express');
const pool = require('../db/mysql');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/* GET /api/routines */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM routines WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/routines/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const [routines] = await pool.query(
      'SELECT * FROM routines WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!routines.length) return res.status(404).json({ error: 'Not found' });

    const [exercises] = await pool.query(
      `SELECT re.*, e.name, e.muscle_group
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = ?`,
      [req.params.id]
    );

    res.json({ ...routines[0], exercises });
  } catch (err) { next(err); }
});

/* POST /api/routines — bulk with transaction */
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, exercises = [] } = req.body;

    const [r] = await conn.query(
      'INSERT INTO routines (user_id, name, description) VALUES (?, ?, ?)',
      [req.user.id, name, description || null]
    );

    for (const ex of exercises) {
      await conn.query(
        `INSERT INTO routine_exercises (routine_id, exercise_id, sets, reps, order_index)
         VALUES (?, ?, ?, ?, ?)`,
        [r.insertId, ex.exercise_id, ex.sets || 3, ex.reps || 10, ex.order_index || 0]
      );
    }

    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
});

/* DELETE /api/routines/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM routines WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;