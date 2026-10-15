require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); 

const app = express();
const PORT = process.env.PORT || 5000;

// ⚠️ MIDDLEWARE
app.use(cors());
app.use(express.json());

// ⚠️ DATABASE CONNECTION POOL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fitforge', 
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 2, // 👈 CRITICAL: Low limit to prevent "max_user_connections" error
  queueLimit: 0
});

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

// ⚠️ THE USER PROFILE ROUTE
app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, full_name, email, role, experience_years, expertise, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(rows[0]); 
  } catch (error) {
    console.error("Database error fetching user:", error);
    res.status(500).json({ error: error.message }); 
  }
});

// Health check route
app.get('/', (req, res) => {
  res.send('FitForge Backend is running!');
});

// ⚠️ START THE SERVER
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
