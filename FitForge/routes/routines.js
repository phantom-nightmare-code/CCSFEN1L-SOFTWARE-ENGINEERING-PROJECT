const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all routines for a user (hardcoded userId=1 for demo)
router.get('/', async (req, res) => {
    const userId = 1; // TODO: from JWT
    try {
        const [routines] = await pool.query(
            'SELECT * FROM routines WHERE user_id = ?',
            [userId]
        );
        // For each routine, fetch its exercises
        for (let r of routines) {
            const [exercises] = await pool.query(`
                SELECT re.*, e.name as exercise_name 
                FROM routine_exercises re
                JOIN exercises e ON re.exercise_id = e.id
                WHERE re.routine_id = ?
                ORDER BY re.order_index
            `, [r.id]);
            r.exercises = exercises;
        }
        res.json(routines);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST a new routine with its exercises (bulk insert)
router.post('/', async (req, res) => {
    const { name, description, exercises } = req.body; // exercises: [{exercise_id, default_sets, default_reps, default_weight}]
    const userId = 1; // from auth
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Insert routine
        const [routineResult] = await connection.query(
            'INSERT INTO routines (user_id, name, description) VALUES (?, ?, ?)',
            [userId, name, description]
        );
        const routineId = routineResult.insertId;
        // Insert routine_exercises
        if (exercises && exercises.length) {
            const values = exercises.map((ex, idx) => [
                routineId,
                ex.exercise_id,
                ex.default_sets || 3,
                ex.default_reps || 10,
                ex.default_weight || 0,
                idx
            ]);
            await connection.query(
                `INSERT INTO routine_exercises 
                 (routine_id, exercise_id, default_sets, default_reps, default_weight, order_index)
                 VALUES ?`,
                [values]
            );
        }
        await connection.commit();
        res.status(201).json({ id: routineId, message: 'Routine created' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// PUT update routine and its exercises (delete old and re-insert)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, exercises } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Update routine
        await connection.query(
            'UPDATE routines SET name = ?, description = ? WHERE id = ?',
            [name, description, id]
        );
        // Delete existing routine_exercises
        await connection.query('DELETE FROM routine_exercises WHERE routine_id = ?', [id]);
        // Re-insert new exercises
        if (exercises && exercises.length) {
            const values = exercises.map((ex, idx) => [
                id,
                ex.exercise_id,
                ex.default_sets || 3,
                ex.default_reps || 10,
                ex.default_weight || 0,
                idx
            ]);
            await connection.query(
                `INSERT INTO routine_exercises 
                 (routine_id, exercise_id, default_sets, default_reps, default_weight, order_index)
                 VALUES ?`,
                [values]
            );
        }
        await connection.commit();
        res.json({ message: 'Routine updated' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// DELETE routine (cascade delete due to FK)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM routines WHERE id = ?', [id]);
        res.json({ message: 'Routine deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;