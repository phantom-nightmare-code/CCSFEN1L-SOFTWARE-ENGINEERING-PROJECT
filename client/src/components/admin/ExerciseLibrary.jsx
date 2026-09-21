import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

const EMPTY = { name: '', muscle_group: '', equipment: '', description: '' };

export default function ExerciseLibrary() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('');
  const { showToast } = useToast();

  const load = () => api.get('/admin/exercises').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const muscleGroups = useMemo(
    () => Array.from(new Set(items.map(i => i.muscle_group).filter(Boolean))).sort(),
    [items]
  );

  const filtered = items.filter(i => {
    if (filterMuscle && i.muscle_group !== filterMuscle) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      muscle_group: item.muscle_group || '',
      equipment: item.equipment || '',
      description: item.description || '',
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/admin/exercises/${editing.id}`, form);
        showToast(`Updated ${form.name}`);
      } else {
        await api.post('/admin/exercises', form);
        showToast(`Added ${form.name}`);
      }
      setShowForm(false); setEditing(null); setForm(EMPTY);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    }
  };

  const remove = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/admin/exercises/${item.id}`);
      showToast(`Deleted ${item.name}`);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Exercise Library ({filtered.length}/{items.length})</h2>
        <button
          onClick={openCreate}
          className="bg-brand-600 text-white px-4 py-2 rounded text-sm hover:bg-brand-700"
        >
          + Add exercise
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <input
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
        />
        <select
          value={filterMuscle}
          onChange={e => setFilterMuscle(e.target.value)}
          className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All muscle groups</option>
          {muscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 space-y-3"
        >
          <h3 className="font-medium">{editing ? 'Edit exercise' : 'New exercise'}</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              required placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              placeholder="Muscle group"
              value={form.muscle_group}
              onChange={e => setForm({ ...form, muscle_group: e.target.value })}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              placeholder="Equipment"
              value={form.equipment}
              onChange={e => setForm({ ...form, equipment: e.target.value })}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <input
            placeholder="Description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
          />
          <div className="flex gap-2">
            <button className="bg-brand-600 text-white px-4 py-2 rounded text-sm hover:bg-brand-700">
              {editing ? 'Save changes' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 py-2 rounded text-sm border border-gray-300 dark:border-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-100 dark:border-gray-800">
              <th className="p-3">Name</th>
              <th>Muscle group</th>
              <th>Equipment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(it => (
              <tr key={it.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3 font-medium">{it.name}</td>
                <td className="text-gray-500">{it.muscle_group || '—'}</td>
                <td className="text-gray-500">{it.equipment || '—'}</td>
                <td className="text-right pr-3 space-x-3">
                  <button
                    onClick={() => openEdit(it)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(it)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-gray-500">No matching exercises.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}