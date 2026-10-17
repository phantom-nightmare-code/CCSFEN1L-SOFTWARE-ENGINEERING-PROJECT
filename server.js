require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.CLIENT_URL ||
  'http://localhost:5173'
).split(',').map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin))
      return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
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
const presenceRoutes = require('./routes/presence');
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
app.use('/api/presence', presenceRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/revoke', revokeRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/users', usersRoutes);

app.get('/', (req, res) => {
  res.send('FitForge Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
