const express = require('express');
const pool = require('../db/mysql');
const { authenticate } = require('../middleware/auth');
const { detectAndUpdatePRs } = require('../services/prDetection');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();
router.use(authenticate);

/* GET /api/workouts */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM workouts WHERE user_id = ?
       ORDER BY workout_date DESC LIMIT 100`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/workouts/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const [workouts] = await pool.query(
      'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!workouts.length) return res.status(404).json({ error: 'Not found' });

    const [sets] = await pool.query(
      `SELECT ws.*, e.name AS exercise_name
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE ws.workout_id = ?`,
      [req.params.id]
    );

    res.json({ ...workouts[0], sets });
  } catch (err) { next(err); }
});

/* POST /api/workouts — bulk insert + PR detection */
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, workout_date, notes, sets = [] } = req.body;

    const [w] = await conn.query(
      `INSERT INTO workouts (user_id, name, workout_date, notes)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, name || 'Workout', workout_date || new Date(), notes || null]
    );

    for (const s of sets) {
      await conn.query(
        `INSERT INTO workout_sets (workout_id, exercise_id, weight, reps, set_number)
         VALUES (?, ?, ?, ?, ?)`,
        [w.insertId, s.exercise_id, s.weight ?? null, s.reps ?? null, s.set_number ?? 1]
      );
    }

    await conn.commit();

    // after successful insert, update PRs & log activity
    const newPRs = await detectAndUpdatePRs(req.user.id);
    await logActivity({
      userId: req.user.id,
      action: 'workout_created',
      req,
      metadata: { workoutId: w.insertId, newPRs: newPRs.length },
    });

    res.status(201).json({ id: w.insertId, newPRs });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
});

/* DELETE /api/workouts/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM workouts WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;