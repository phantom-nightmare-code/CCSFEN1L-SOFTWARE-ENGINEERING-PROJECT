require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); 
const mongoose = require('mongoose'); 

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ⚠️ MYSQL DATABASE CONNECTION POOL
// ✅ FIXED: Using the exact variable names from your Render dashboard (MYSQL_...)
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'fitforge', 
  port: process.env.MYSQL_PORT || 3306,
  // ✅ FIXED: Added SSL configuration because MYSQL_SSL is set to true
  ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : false,
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0
});

// ⚠️ MONGODB CONNECTION (Required for Admin routes)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully for Admin routes'))
  .catch(err => console.error('MongoDB connection error:', err));

// ⚠️ IMPORT YOUR EXISTING ROUTES
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const coachPaymentsRoutes = require('./routes/coachPayments');
const coachesRoutes = require('./routes/coaches');
const exercisesRoutes = require('./routes/exercises');
const membershipsRoutes = require('./routes/memberships');
const myCoachRoutes = require('./routes/myCoach');
const paymentsRoutes = require('./routes/payments');
const recommendationsRoutes = require('./routes/recommendations');
const rentalsRoutes = require('./routes/rentals');
const revokeRoutes = require('./routes/revoke');
const routinesRoutes = require('./routes/routines');
const workoutsRoutes = require('./routes/workouts');

// ⚠️ MOUNT YOUR EXISTING ROUTES
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/coach-payments', coachPaymentsRoutes);
app.use('/api/coaches', coachesRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/my-coach', myCoachRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/revoke', revokeRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/workouts', workoutsRoutes);

// ⚠️ THE USER PROFILE ROUTE (GET)
app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, full_name, email, role, experience_years, expertise, created_at 
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(rows[0]); 
  } catch (error) {
    console.error("❌ Database error fetching user:", error);
    res.status(500).json({ 
      error: error.sqlMessage || error.message || 'Unknown database error',
      fullError: JSON.stringify(error)
    }); 
  }
});

// ⚠️ THE USER PROFILE UPDATE ROUTE (PUT)
app.put('/api/users/:id/coach-details', async (req, res) => {
  try {
    const { full_name, experience_years, expertise } = req.body;
    const userId = req.params.id;

    if (!userId) return res.status(400).json({ error: 'User ID required' });

    await pool.query(
      'UPDATE users SET full_name = ?, experience_years = ?, expertise = ? WHERE id = ?',
      [full_name, experience_years || 0, expertise || null, userId]
    );

    res.json({ ok: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error("❌ Error updating coach details:", error);
    res.status(500).json({ 
      error: error.sqlMessage || error.message || 'Unknown database error',
      fullError: JSON.stringify(error)
    });
  }
});

app.get('/', (req, res) => {
  res.send('FitForge Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
