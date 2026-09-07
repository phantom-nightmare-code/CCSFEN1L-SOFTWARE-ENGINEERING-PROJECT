import React, { useState, useEffect } from 'react';
import API from '../api';

function Workouts() {
    const [workouts, setWorkouts] = useState([]);

    useEffect(() => {
        API.get('/workouts')
            .then(res => setWorkouts(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>Workout History</h2>
            {workouts.length === 0 && <p>No workouts logged yet.</p>}
            {workouts.map((w) => (
                <div key={w.id} className="card" style={{ marginBottom: '20px' }}>
                    {/* The Date Fix below */}
                    <h3>
                        {new Date(w.workout_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        })} - {w.notes || 'Workout'}
                    </h3>
                    
                    {/* Render all sets */}
                    {w.sets.map((s) => (
                        <div key={s.id} className="set-item" style={{ padding: '10px', margin: '5px 0', background: '#111', borderRadius: '5px' }}>
                            <span>
                                - Set {s.set_number}: {s.weight}kg x {s.reps} reps
                            </span>
                            {/* Only show PR badge if is_pr is true */}
                            {s.is_pr === 1 && (
                                <span style={{ marginLeft: '10px', color: 'green', fontWeight: 'bold' }}>🏆 PR</span>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default Workouts;