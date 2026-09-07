import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Routines from './components/Routines';
import Workouts from './components/Workouts';
import LogWorkout from './components/LogWorkout';
import Dashboard from './components/Dashboard';
import './styles/App.css';   // <-- import styles

function App() {
    return (
        <BrowserRouter>
            <div className="app-container">
                <h1>🏋️ FitForge</h1>
                <nav>
                    <Link to="/">Dashboard</Link>
                    <Link to="/routines">Routines</Link>
                    <Link to="/workouts">Workouts</Link>
                    <Link to="/log">Log Workout</Link>
                </nav>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/routines" element={<Routines />} />
                    <Route path="/workouts" element={<Workouts />} />
                    <Route path="/log" element={<LogWorkout />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;