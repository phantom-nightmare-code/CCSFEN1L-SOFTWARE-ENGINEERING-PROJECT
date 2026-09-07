const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all workouts for a user (with sets)
router.get('/', async (req, res) => {
    const userId = 1;
    try {
        const [workouts] = await pool.query(
            'SELECT * FROM workouts WHERE user_id = ? ORDER BY workout_date DESC',
            [userId]
        );
        for (let w of workouts) {
            const [sets] = await pool.query(`
                SELECT ws.*, e.name as exercise_name 
                FROM workout_sets ws
                JOIN exercises e ON ws.exercise_id = e.id
                WHERE ws.workout_id = ?
                ORDER BY ws.id
            `, [w.id]);
            w.sets = sets;
        }
        res.json(workouts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST a new workout with its sets
router.post('/', async (req, res) => {
    const { routine_id, workout_date, notes, sets } = req.body;
    // sets: [{exercise_id, set_number, weight, reps}]
    const userId = 1;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Insert workout
        const [workoutResult] = await connection.query(
            'INSERT INTO workouts (user_id, routine_id, workout_date, notes) VALUES (?, ?, ?, ?)',
            [userId, routine_id || null, workout_date, notes || '']
        );
        const workoutId = workoutResult.insertId;

        // Insert each set
        for (let s of sets) {
            await connection.query(
                'INSERT INTO workout_sets (workout_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?)',
                [workoutId, s.exercise_id, s.set_number, s.weight, s.reps]
            );
        }

        // PR Detection is DISABLED for now to prevent 500 errors.
        // await detectAndUpdatePRs(connection, workoutId);

        await connection.commit();
        res.status(201).json({ id: workoutId, message: 'Workout logged' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;