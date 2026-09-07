import React, { useState, useEffect } from 'react';
import API from '../api';

function LogWorkout() {
    const [exercises, setExercises] = useState([]);
    const [workout, setWorkout] = useState({
        workout_date: new Date().toISOString().split('T')[0],
        notes: '',
        sets: [{ exercise_id: 1, set_number: 1, weight: 0, reps: 0 }]
    });

    useEffect(() => {
        API.get('/exercises')
            .then(res => setExercises(res.data))
            .catch(err => console.error("Failed to load exercises", err));
    }, []);

    const addSet = () => {
        setWorkout({
            ...workout,
            sets: [...workout.sets, { 
                exercise_id: workout.sets[0].exercise_id, 
                set_number: workout.sets.length + 1, 
                weight: 0, 
                reps: 0 
            }]
        });
    };

    const handleChange = (index, field, value) => {
        const newSets = [...workout.sets];
        
        // FIX: Check for empty strings to avoid NaN errors
        if (field === 'weight') {
            newSets[index][field] = value === '' ? 0 : parseFloat(value);
        } else if (field === 'reps') {
            newSets[index][field] = value === '' ? 0 : parseInt(value);
        } else if (field === 'exercise_id') {
            newSets[index][field] = parseInt(value);
        } else {
            newSets[index][field] = value;
        }
        
        setWorkout({...workout, sets: newSets});
    };

    const submitWorkout = async () => {
        await API.post('/workouts', workout);
        alert('Workout logged!');
        setWorkout({
            workout_date: new Date().toISOString().split('T')[0],
            notes: '',
            sets: [{ exercise_id: 1, set_number: 1, weight: 0, reps: 0 }]
        });
    };

    return (
        <div>
            <h2>Log Workout</h2>
            <div className="card">
                <div className="form-group">
                    <input type="date" value={workout.workout_date} 
                        onChange={e => setWorkout({...workout, workout_date: e.target.value})} />
                    <textarea placeholder="Notes" value={workout.notes}
                        onChange={e => setWorkout({...workout, notes: e.target.value})} />
                </div>
                <h3>Sets</h3>
                {workout.sets.map((set, idx) => (
                    <div key={idx} className="set-row">
                        <select 
                            value={set.exercise_id}
                            onChange={e => handleChange(idx, 'exercise_id', e.target.value)}
                        >
                            {/* FIX: Shows placeholder if empty, otherwise maps exercises */}
                            {exercises.length > 0 ? (
                                exercises.map(ex => (
                                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                                ))
                            ) : (
                                <option value="">No Exercises Available</option>
                            )}
                        </select>
                        <input type="number" placeholder="Weight (kg)" value={set.weight}
                            onChange={e => handleChange(idx, 'weight', e.target.value)} />
                        <input type="number" placeholder="Reps" value={set.reps}
                            onChange={e => handleChange(idx, 'reps', e.target.value)} />
                    </div>
                ))}
                <div className="flex" style={{ marginTop: '10px' }}>
                    <button className="secondary" onClick={addSet}>+ Add Set</button>
                    <button onClick={submitWorkout}>Save Workout</button>
                </div>
            </div>
        </div>
    );
}

export default LogWorkout;