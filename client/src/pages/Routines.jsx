import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Routines() {
  const [routines, setRoutines] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    exercises: [{ exercise_id: '', sets: 3, reps: 10 }],
  });
  const nav = useNavigate();

  const load = () => {
    api.get('/routines').then(r => setRoutines(r.data));
    api.get('/exercises').then(r => setExercises(r.data));
  };
  useEffect(load, []);

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!details[id]) {
      const { data } = await api.get(`/routines/${id}`);
      setDetails(d => ({ ...d, [id]: data }));
    }
  };

  const addExercise = () => setForm(f => ({
    ...f,
    exercises: [...f.exercises, { exercise_id: '', sets: 3, reps: 10 }],
  }));

  const updateExercise = (i, field, value) => setForm(f => ({
    ...f,
    exercises: f.exercises.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex),
  }));

  const removeExercise = (i) => setForm(f => ({
    ...f,
    exercises: f.exercises.filter((_, idx) => idx !== i),
  }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const payload = {
        name: form.name,
        description: form.description,
        exercises: form.exercises
          .filter(ex => ex.exercise_id)
          .map((ex, i) => ({
            exercise_id: Number(ex.exercise_id),
            sets: Number(ex.sets) || 3,
            reps: Number(ex.reps) || 10,
            order_index: i,
          })),
      };
      await api.post('/routines', payload);
      setMsg('✅ Routine created');
      setForm({ name: '', description: '', exercises: [{ exercise_id: '', sets: 3, reps: 10 }] });
      setShowForm(false);
      load();
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || 'Failed to save routine'}`);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this routine?')) return;
    await api.delete(`/routines/${id}`);
    load();
    if (expanded === id) setExpanded(null);
  };

  const startWorkout = async (id) => {
    let routine = details[id];
    if (!routine) {
      const { data } = await api.get(`/routines/${id}`);
      routine = data;
    }
    nav('/workouts', { state: { fromRoutine: routine } });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Routines</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 text-sm"
        >
          {showForm ? 'Cancel' : '+ New routine'}
        </button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}

      {showForm && (
        <form onSubmit={submit}
          className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 space-y-4">
          <input
            required placeholder="Routine name (e.g. Push Day)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Exercises</p>
            {form.exercises.map((ex, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  required value={ex.exercise_id}
                  onChange={e => updateExercise(i, 'exercise_id', e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">Select exercise…</option>
                  {exercises.map(e2 => (
                    <option key={e2.id} value={e2.id}>{e2.name}</option>
                  ))}
                </select>
                <input
                  type="number" min="1" value={ex.sets}
                  onChange={e => updateExercise(i, 'sets', e.target.value)}
                  placeholder="sets"
                  className="w-16 border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <input
                  type="number" min="1" value={ex.reps}
                  onChange={e => updateExercise(i, 'reps', e.target.value)}
                  placeholder="reps"
                  className="w-16 border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => removeExercise(i)}
                  disabled={form.exercises.length === 1}
                  className="text-red-600 text-sm disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button" onClick={addExercise}
              className="text-sm text-brand-600 hover:underline"
            >
              + Add another exercise
            </button>
          </div>

          <button className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700">
            Save routine
          </button>
        </form>
      )}

      <div className="space-y-3">
        {routines.length === 0 && (
          <p className="text-gray-500 text-sm">No routines yet.</p>
        )}
        {routines.map(r => (
          <div key={r.id}
            className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
            <div className="p-4 flex justify-between items-center">
              <button onClick={() => toggleExpand(r.id)} className="text-left flex-1">
                <div className="font-semibold">{r.name}</div>
                {r.description && (
                  <div className="text-xs text-gray-500">{r.description}</div>
                )}
              </button>
              <div className="flex gap-3 items-center ml-3">
                <button
                  onClick={() => startWorkout(r.id)}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Start
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
            {expanded === r.id && details[r.id] && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-2">
                {details[r.id].exercises?.length === 0 && (
                  <p className="text-sm text-gray-500">No exercises.</p>
                )}
                {details[r.id].exercises?.map(ex => (
                  <div key={ex.id} className="text-sm flex justify-between">
                    <span>
                      {ex.name}{' '}
                      <span className="text-gray-400">({ex.muscle_group})</span>
                    </span>
                    <span className="text-gray-500">{ex.sets} × {ex.reps}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}