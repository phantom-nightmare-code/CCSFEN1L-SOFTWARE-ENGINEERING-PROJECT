const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /1rm/:exerciseId - Calculate estimated 1RM over time for a specific exercise
router.get('/1rm/:exerciseId', async (req, res) => {
    const userId = 1; // hardcoded for demo (TODO: from JWT)
    const { exerciseId } = req.params;
    
    try {
        const [rows] = await pool.query(`
            WITH set_data AS (
                SELECT 
                    w.workout_date,
                    ws.weight,
                    ws.reps,
                    -- Brzycki formula for 1RM
                    ROUND(ws.weight * (36 / (37 - ws.reps)), 2) AS est_1rm
                FROM workout_sets ws
                JOIN workouts w ON ws.workout_id = w.id
                WHERE w.user_id = ? AND ws.exercise_id = ?
                ORDER BY w.workout_date, ws.id
            ),
            -- Use LAG to get previous value for trend
            with_prev AS (
                SELECT *,
                    LAG(est_1rm, 1) OVER (ORDER BY workout_date) AS prev_1rm,
                    AVG(est_1rm) OVER (ORDER BY workout_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg_3
                FROM set_data
            )
            SELECT 
                workout_date,
                est_1rm,
                prev_1rm,
                ROUND((est_1rm - prev_1rm) / NULLIF(prev_1rm, 0) * 100, 2) AS pct_change,
                moving_avg_3
            FROM with_prev
            ORDER BY workout_date;
        `, [userId, exerciseId]);
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /recent-prs - Get the latest Personal Records for the Dashboard
// (This fixes the 404 error on your Dashboard.js line 21)
router.get('/recent-prs', async (req, res) => {
    const userId = 1; // hardcoded for demo (TODO: from JWT)
    
    try {
        const [rows] = await pool.query(`
            SELECT 
                w.workout_date,
                MAX(ROUND(ws.weight * (36 / (37 - ws.reps)), 2)) AS best_pr,
                e.name AS exercise_name
            FROM workout_sets ws
            JOIN workouts w ON ws.workout_id = w.id
            JOIN exercises e ON ws.exercise_id = e.id
            WHERE w.user_id = ?
            GROUP BY w.workout_date, e.name
            ORDER BY w.workout_date DESC
            LIMIT 5
        `, [userId]);
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;