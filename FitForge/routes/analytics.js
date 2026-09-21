const express = require('express');
const pool = require('../db/mysql');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/* GET /api/analytics/volume?days=30 — total volume per day */
router.get('/volume', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const [rows] = await pool.query(
      `SELECT w.workout_date AS date,
              SUM(ws.weight * ws.reps) AS volume
       FROM workouts w
       JOIN workout_sets ws ON ws.workout_id = w.id
       WHERE w.user_id = ?
         AND w.workout_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY w.workout_date
       ORDER BY w.workout_date`,
      [req.user.id, days]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/analytics/prs — current personal records */
router.get('/prs', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT pr.best_1rm, pr.achieved_at, e.name, e.muscle_group
       FROM personal_records pr
       JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id = ?
       ORDER BY pr.achieved_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/analytics/muscle-balance?days=30 */
router.get('/muscle-balance', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const [rows] = await pool.query(
      `SELECT e.muscle_group,
              SUM(ws.weight * ws.reps) AS volume
       FROM workout_sets ws
       JOIN workouts  w ON w.id = ws.workout_id
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE w.user_id = ?
         AND w.workout_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY e.muscle_group`,
      [req.user.id, days]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;