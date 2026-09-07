const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all exercises
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM exercises ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new exercise
router.post('/', async (req, res) => {
    const { name, muscle_group } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO exercises (name, muscle_group) VALUES (?, ?)',
            [name, muscle_group]
        );
        res.status(201).json({ id: result.insertId, name, muscle_group });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, muscle_group } = req.body;
    try {
        await pool.query(
            'UPDATE exercises SET name = ?, muscle_group = ? WHERE id = ?',
            [name, muscle_group, id]
        );
        res.json({ message: 'Exercise updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM exercises WHERE id = ?', [id]);
        res.json({ message: 'Exercise deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;