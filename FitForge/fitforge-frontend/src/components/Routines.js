import React, { useState, useEffect } from 'react';
import API from '../api';

function Routines() {
    const [routines, setRoutines] = useState([]);
    const [newRoutine, setNewRoutine] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchRoutines();
    }, []);

    const fetchRoutines = async () => {
        const res = await API.get('/routines');
        setRoutines(res.data);
    };

    const createRoutine = async () => {
        await API.post('/routines', { ...newRoutine, exercises: [] });
        fetchRoutines();
        setNewRoutine({ name: '', description: '' });
    };

    const deleteRoutine = async (id) => {
        await API.delete(`/routines/${id}`);
        fetchRoutines();
    };

    return (
        <div>
            <h2>Routines</h2>
            <ul className="card">
                {routines.map(r => (
                    <li key={r.id}>
                        <span><strong>{r.name}</strong> – {r.description}</span>
                        <button className="danger" onClick={() => deleteRoutine(r.id)}>Delete</button>
                    </li>
                ))}
            </ul>
            <div className="card">
                <h3>Add Routine</h3>
                <div className="form-group">
                    <input 
                        placeholder="Name" 
                        value={newRoutine.name}
                        onChange={e => setNewRoutine({...newRoutine, name: e.target.value})}
                    />
                    <input 
                        placeholder="Description"
                        value={newRoutine.description}
                        onChange={e => setNewRoutine({...newRoutine, description: e.target.value})}
                    />
                    <button onClick={createRoutine}>Create</button>
                </div>
            </div>
        </div>
    );
}

export default Routines;