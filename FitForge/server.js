require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const pool = require('./db/mysql');
const connectMongo = require('./db/mongo');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* ---------- DB connections ---------- */
connectMongo();
pool.getConnection()
  .then(c => {
    console.log('✅ MySQL connected');
    c.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  });

/* ---------- Routes ---------- */
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/admin',           require('./routes/admin'));
app.use('/api/coaches',         require('./routes/coaches'));
app.use('/api/my-coach',        require('./routes/myCoach'));
app.use('/api/memberships',     require('./routes/memberships'));
app.use('/api/payments',        require('./routes/payments'));
app.use('/api/rentals',         require('./routes/rentals'));
app.use('/api/recommendations', require('./routes/recommendations'));

app.use('/api/routines',        require('./routes/routines'));
app.use('/api/workouts',        require('./routes/workouts'));
app.use('/api/analytics',       require('./routes/analytics'));
app.use('/api/exercises',       require('./routes/exercises'));

/* ---------- Health ---------- */
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

/* ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 FitForge API on :${PORT}`));