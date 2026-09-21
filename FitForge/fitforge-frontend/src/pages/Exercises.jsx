import { useEffect, useMemo, useState } from 'react';
import api from '../api';

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipFilter, setEquipFilter] = useState('');
  const [search, setSearch] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/exercises')
      .then(r => setExercises(r.data))
      .catch(e => setErr(e.response?.data?.error || 'Failed to load exercises'));
  }, []);

  const muscleGroups = useMemo(
    () => Array.from(new Set(exercises.map(e => e.muscle_group).filter(Boolean))).sort(),
    [exercises]
  );
  const equipmentList = useMemo(
    () => Array.from(new Set(exercises.map(e => e.equipment).filter(Boolean))).sort(),
    [exercises]
  );

  const filtered = useMemo(() => {
    return exercises.filter(e => {
      if (muscleFilter && e.muscle_group !== muscleFilter) return false;
      if (equipFilter && e.equipment !== equipFilter) return false;
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [exercises, muscleFilter, equipFilter, search]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Exercise Library</h1>
      {err && <p className="text-red-500 text-sm">{err}</p>}

      <div className="grid md:grid-cols-3 gap-3">
        <input
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
        />
        <select
          value={muscleFilter}
          onChange={e => setMuscleFilter(e.target.value)}
          className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All muscle groups</option>
          {muscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={equipFilter}
          onChange={e => setEquipFilter(e.target.value)}
          className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All equipment</option>
          {equipmentList.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        {filtered.map(e => (
          <div key={e.id}
            className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold">{e.name}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {e.muscle_group}{e.equipment ? ` · ${e.equipment}` : ''}
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-3 text-center text-gray-500 py-8">No matches.</p>
        )}
      </div>
    </div>
  );
}