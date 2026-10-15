require('dotenv').config();
const express = require('express');
const cors = require('cors');

// ⚠️ STEP 1: IMPORT YOUR MYSQL CONNECTION
// Make sure this path matches where your database connection file is located.
// If your file is named something else (e.g., 'config/db.js'), change './db' to match.
const db = require('./db'); 

const app = express();
const PORT = process.env.PORT || 5000;

// ⚠️ STEP 2: MIDDLEWARE
app.use(cors());
app.use(express.json());

// ⚠️ STEP 3: IMPORT YOUR EXISTING ROUTES
// These are the files from your routes folder screenshot
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

// ⚠️ STEP 4: MOUNT YOUR EXISTING ROUTES
// Add any other routes you have here
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

// ⚠️ STEP 5: THE MISSING ROUTE THAT FIXES THE 404 ERROR
// This directly handles GET https://fitforge-backend-wey2.onrender.com/api/users/5
app.get('/api/users/:id', async (req, res) => {
  try {
    // We add 'created_at' to the SELECT statement so your frontend gets the date!
    const [rows] = await db.query(
      'SELECT id, username, full_name, email, role, experience_years, expertise, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(rows[0]); 
  } catch (error) {
    console.error("Database error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Basic health check route to make sure the server is running
app.get('/', (req, res) => {
  res.send('FitForge Backend is running!');
});

// ⚠️ STEP 6: START THE SERVER
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
