const pool = require('../db/mysql');

async function getRecommendations(userId, limit = 6) {
  // muscle groups worked in the last 30 days
  const [recent] = await pool.query(
    `
    SELECT e.muscle_group, COUNT(*) AS cnt
    FROM workout_sets ws
    JOIN workouts  w ON w.id = ws.workout_id
    JOIN exercises e ON e.id = ws.exercise_id
    WHERE w.user_id = ?
      AND w.workout_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY e.muscle_group
    `,
    [userId]
  );

  const done = new Set(recent.map(r => r.muscle_group));

  const [all] = await pool.query('SELECT DISTINCT muscle_group FROM exercises WHERE muscle_group IS NOT NULL');
  const neglected = all.map(r => r.muscle_group).filter(m => !done.has(m));

  if (!neglected.length) {
    return { neglected: [], suggestions: [], message: 'Balanced routine — keep it up!' };
  }

  const [suggestions] = await pool.query(
    `SELECT id, name, muscle_group, equipment
     FROM exercises
     WHERE muscle_group IN (?)
     ORDER BY RAND()
     LIMIT ?`,
    [neglected, limit]
  );

  return { neglected, suggestions };
}

module.exports = { getRecommendations };