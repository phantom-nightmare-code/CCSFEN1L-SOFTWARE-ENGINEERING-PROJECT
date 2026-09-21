import { useEffect, useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

const EMPTY = { name: '', category: '', description: '', hourly_rate: '', stock: 0 };

export default function RentalInventory() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const { showToast } = useToast();

  const load = () => api.get('/admin/rental-items').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      category: item.category || '',
      description: item.description || '',
      hourly_rate: item.hourly_rate ?? '',
      stock: item.stock ?? 0,
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        hourly_rate: Number(form.hourly_rate),
        stock: Number(form.stock),
      };
      if (editing) {
        await api.patch(`/admin/rental-items/${editing.id}`, payload);
        showToast(`Updated ${payload.name}`);
      } else {
        await api.post('/admin/rental-items', payload);
        showToast(`Added ${payload.name}`);
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    }
  };

  const remove = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/admin/rental-items/${item.id}`);
      showToast(`Deleted ${item.name}`);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Rental Inventory ({items.length})</h2>
        <button
          onClick={openCreate}
          className="bg-brand-600 text-white px-4 py-2 rounded text-sm hover:bg-brand-700"
        >
          + Add item
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 space-y-3"
        >
          <h3 className="font-medium">{editing ? 'Edit item' : 'New item'}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              required placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              placeholder="Category"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              required type="number" step="0.01" min="0" placeholder="Hourly rate ₱"
              value={form.hourly_rate}
              onChange={e => setForm({ ...form, hourly_rate: e.target.value })}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              type="number" min="0" placeholder="Stock"
              value={form.stock}
              onChange={e => setForm({ ...form, stock: e.target.value })}
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
              <th>Category</th>
              <th>Rate</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3 font-medium">{it.name}</td>
                <td className="text-gray-500">{it.category || '—'}</td>
                <td>₱{Number(it.hourly_rate).toFixed(2)}/hr</td>
                <td>{it.stock}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}