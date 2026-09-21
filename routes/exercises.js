const express = require('express');
const pool = require('../db/mysql');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/* GET /api/exercises */
router.get('/', async (req, res, next) => {
  try {
    const { muscle_group, equipment } = req.query;
    const where = [];
    const params = [];

    if (muscle_group) { where.push('muscle_group = ?'); params.push(muscle_group); }
    if (equipment)    { where.push('equipment = ?');    params.push(equipment); }

    const sql = `SELECT * FROM exercises
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY muscle_group, name`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/exercises/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;