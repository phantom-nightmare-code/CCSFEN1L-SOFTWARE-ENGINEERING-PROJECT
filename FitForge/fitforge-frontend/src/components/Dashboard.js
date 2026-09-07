import React, { useState, useEffect } from 'react';
import API from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

function Dashboard() {
    const [exerciseId, setExerciseId] = useState(1);
    const [data, setData] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [prs, setPrs] = useState([]);

    useEffect(() => {
        API.get('/exercises').then(res => setExercises(res.data));
    }, []);

    useEffect(() => {
        if (exerciseId) {
            API.get(`/analytics/1rm/${exerciseId}`)
                .then(res => setData(res.data))
                .catch(err => console.error(err));
        }
        API.get('/analytics/recent-prs')
            .then(res => setPrs(res.data))
            .catch(err => console.error(err));
    }, [exerciseId]);

    return (
        <div>
            <h2>Dashboard</h2>
            <div className="dashboard-grid">
                <div className="chart-container">
                    <h3>1‑Rep Max Progression</h3>
                    <div className="form-group">
                        <select onChange={e => setExerciseId(e.target.value)} value={exerciseId}>
                            {exercises.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.name}</option>
                            ))}
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="workout_date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="est_1rm" stroke="#8884d8" name="1RM" />
                            <Line type="monotone" dataKey="moving_avg_3" stroke="#82ca9d" strokeDasharray="5 5" name="3‑session avg" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <h3>🏆 Recent PRs</h3>
                    <ul>
                        {prs.map(p => (
                            <li key={p.id}>
                                <span>
                                    {p.exercise_name}: {p.weight}kg × {p.reps} reps 
                                    <span className="text-muted"> (1RM: {p.est_1rm}kg)</span>
                                </span>
                                <span className="text-muted">{p.workout_date}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;