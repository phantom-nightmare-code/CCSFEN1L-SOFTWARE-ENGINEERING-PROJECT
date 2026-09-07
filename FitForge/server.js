const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Import Routes ---
const routineRoutes = require('./routes/routines');
const workoutRoutes = require('./routes/workouts');
const analyticsRoutes = require('./routes/analytics');
const exerciseRoutes = require('./routes/exercises');

// --- Mount Routes ---
app.use('/api/routines', routineRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/exercises', exerciseRoutes);

// --- 404 Handler (Catches unmatched routes) ---
// Placed at the bottom, after all valid routes, so unknown URLs get a JSON 404
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

// --- Centralized Error Handler ---
// Catches any error passed to next() in your routes and sends a clean JSON response
app.use((err, req, res, next) => {
    console.error(err.stack); // Logs the full error to your backend terminal
    res.status(err.status || 500).json({ 
        error: err.message || 'Internal Server Error' 
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));