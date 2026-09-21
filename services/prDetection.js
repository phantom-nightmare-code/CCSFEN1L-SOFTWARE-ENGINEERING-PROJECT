const pool = require('../db/mysql');

/**
 * Scans all sets for a given user and inserts/updates personal records.
 * Assumes a `personal_records` table:
 *   (user_id, exercise_id, best_1rm, achieved_at)
 */
async function detectAndUpdatePRs(userId) {
  // Epley formula: 1RM = w * (1 + reps/30)
  const [rows] = await pool.query(
    `
    WITH ranked AS (
      SELECT
        w.user_id,
        ws.exercise_id,
        ws.weight,
        ws.reps,
        ws.weight * (1 + ws.reps / 30.0) AS estimated_1rm,
        w.workout_date,
        ROW_NUMBER() OVER (
          PARTITION BY w.user_id, ws.exercise_id
          ORDER BY ws.weight * (1 + ws.reps / 30.0) DESC
        ) AS rn
      FROM workout_sets ws
      JOIN workouts w ON w.id = ws.workout_id
      WHERE w.user_id = ?
        AND ws.weight IS NOT NULL
        AND ws.reps  IS NOT NULL
        AND ws.reps  > 0
    )
    SELECT user_id, exercise_id, estimated_1rm, workout_date
    FROM ranked
    WHERE rn = 1
    `,
    [userId]
  );

  if (!rows.length) return [];

  const updated = [];
  for (const r of rows) {
    const [existing] = await pool.query(
      `SELECT id, best_1rm FROM personal_records
       WHERE user_id = ? AND exercise_id = ? LIMIT 1`,
      [r.user_id, r.exercise_id]
    );

    if (!existing.length) {
      await pool.query(
        `INSERT INTO personal_records (user_id, exercise_id, best_1rm, achieved_at)
         VALUES (?, ?, ?, ?)`,
        [r.user_id, r.exercise_id, r.estimated_1rm, r.workout_date]
      );
      updated.push({ exercise_id: r.exercise_id, new_pr: r.estimated_1rm });
    } else if (Number(existing[0].best_1rm) < Number(r.estimated_1rm)) {
      await pool.query(
        `UPDATE personal_records SET best_1rm = ?, achieved_at = ?
         WHERE id = ?`,
        [r.estimated_1rm, r.workout_date, existing[0].id]
      );
      updated.push({ exercise_id: r.exercise_id, new_pr: r.estimated_1rm });
    }
  }

  return updated;
}

module.exports = { detectAndUpdatePRs };