import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

export default function Workouts() {
  const location = useLocation();
  const fromRoutine = location.state?.fromRoutine;

  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});
  const [showForm, setShowForm] = useState(!!fromRoutine);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    name: fromRoutine?.name || '',
    workout_date: new Date().toISOString().slice(0, 10),
    notes: '',
    sets: fromRoutine?.exercises?.length
      ? fromRoutine.exercises.map((ex, i) => ({
          exercise_id: String(ex.exercise_id),
          weight: '',
          reps: '',
          set_number: i + 1,
        }))
      : [{ exercise_id: '', weight: '', reps: '', set_number: 1 }],
  });

  const load = () => {
    api.get('/workouts').then(r => setWorkouts(r.data));
    api.get('/exercises').then(r => setExercises(r.data));
  };
  useEffect(load, []);

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!details[id]) {
      const { data } = await api.get(`/workouts/${id}`);
      setDetails(d => ({ ...d, [id]: data }));
    }
  };

  const addSet = () => setForm(f => ({
    ...f,
    sets: [...f.sets, { exercise_id: '', weight: '', reps: '', set_number: f.sets.length + 1 }],
  }));

  const updateSet = (i, field, value) => setForm(f => ({
    ...f,
    sets: f.sets.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
  }));

  const removeSet = (i) => setForm(f => ({
    ...f,
    sets: f.sets.filter((_, idx) => idx !== i),
  }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const payload = {
        name: form.name,
        workout_date: form.workout_date,
        notes: form.notes,
        sets: form.sets
          .filter(s => s.exercise_id)
          .map(s => ({
            exercise_id: Number(s.exercise_id),
            weight: s.weight !== '' ? Number(s.weight) : null,
            reps: s.reps !== '' ? Number(s.reps) : null,
            set_number: s.set_number,
          })),
      };
      const { data } = await api.post('/workouts', payload);
      const prCount = data.newPRs?.length || 0;
      setMsg(`✅ Workout logged${prCount ? ` — 🎉 ${prCount} new PR(s)!` : ''}`);
      setForm({
        name: '',
        workout_date: new Date().toISOString().slice(0, 10),
        notes: '',
        sets: [{ exercise_id: '', weight: '', reps: '', set_number: 1 }],
      });
      setShowForm(false);
      load();
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || 'Failed to save workout'}`);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this workout?')) return;
    await api.delete(`/workouts/${id}`);
    load();
    if (expanded === id) setExpanded(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Workouts</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 text-sm"
        >
          {showForm ? 'Cancel' : '+ Log workout'}
        </button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}

      {showForm && (
        <form onSubmit={submit}
          className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              required placeholder="Workout name (e.g. Push Day)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              type="date" value={form.workout_date}
              onChange={e => setForm({ ...form, workout_date: e.target.value })}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Sets</p>
            {form.sets.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  required value={s.exercise_id}
                  onChange={e => updateSet(i, 'exercise_id', e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">Select exercise…</option>
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
                <input
                  type="number" step="0.5" min="0" placeholder="kg"
                  value={s.weight}
                  onChange={e => updateSet(i, 'weight', e.target.value)}
                  className="w-20 border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <input
                  type="number" min="1" placeholder="reps"
                  value={s.reps}
                  onChange={e => updateSet(i, 'reps', e.target.value)}
                  className="w-20 border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => removeSet(i)}
                  disabled={form.sets.length === 1}
                  className="text-red-600 text-sm disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button" onClick={addSet}
              className="text-sm text-brand-600 hover:underline"
            >
              + Add another set
            </button>
          </div>

          <button className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700">
            Save workout
          </button>
        </form>
      )}

      <div className="space-y-3">
        {workouts.length === 0 && (
          <p className="text-gray-500 text-sm">No workouts logged yet.</p>
        )}
        {workouts.map(w => (
          <div key={w.id}
            className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
            <div className="p-4 flex justify-between items-center">
              <button onClick={() => toggleExpand(w.id)} className="text-left flex-1">
                <div className="font-semibold">{w.name}</div>
                <div className="text-xs text-gray-500">
                  {w.workout_date?.slice(0, 10)}{w.notes ? ` · ${w.notes}` : ''}
                </div>
              </button>
              <button onClick={() => remove(w.id)} className="text-xs text-red-600 ml-3">
                Delete
              </button>
            </div>
            {expanded === w.id && details[w.id] && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-2">
                {details[w.id].sets?.length === 0 && (
                  <p className="text-sm text-gray-500">No sets recorded.</p>
                )}
                {details[w.id].sets?.map(s => (
                  <div key={s.id} className="text-sm flex justify-between">
                    <span>{s.exercise_name}</span>
                    <span className="text-gray-500">
                      {s.weight ?? '—'} kg × {s.reps ?? '—'} reps
                    </span>
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