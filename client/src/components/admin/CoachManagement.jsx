import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function CoachManagement() {
  const { showToast } = useToast();
  const [coaches, setCoaches] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ coachId: '', clientId: '' });

  const load = () => {
    return Promise.all([
      api.get('/admin/coaches').then(r => setCoaches(r.data)),
      api.get('/admin/users').then(r => setUsers(r.data)),
      api.get('/admin/coach-assignments').then(r => setAssignments(r.data)),
    ]);
  };

  useEffect(() => { load(); }, []);

  const displayName = (u) =>
    u?.full_name || u?.username || u?.email || `User #${u?.id}`;

  // Only regular users can be clients (exclude admins + coaches)
  const clientCandidates = useMemo(
    () => users.filter(u => u.role === 'user'),
    [users]
  );

  const assign = async (e) => {
    e.preventDefault();
    if (!form.coachId || !form.clientId) return;
    setBusy(true);
    try {
      await api.post('/admin/coach-assignments', {
        coachId: Number(form.coachId),
        clientId: Number(form.clientId),
      });
      showToast('Coach assigned successfully');
      setForm({ coachId: '', clientId: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to assign', 'error');
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await api.delete(`/admin/coach-assignments/${id}`);
      showToast('Assignment removed');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const promoteToCoach = async (userId) => {
    if (!confirm('Promote this user to Coach?')) return;
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: 'coach' });
      showToast('Promoted to Coach');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const demoteCoach = async (userId) => {
    if (!confirm('Demote this coach back to User?')) return;
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: 'user' });
      showToast('Coach demoted to user');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Coach Management</h2>

      {/* ---------- Assign form ---------- */}
      <section className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
        <h3 className="font-semibold mb-3">Assign a coach to a client</h3>
        <form onSubmit={assign} className="grid md:grid-cols-3 gap-3">
          <select
            required
            value={form.coachId}
            onChange={e => setForm({ ...form, coachId: e.target.value })}
            className="border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">— Select coach —</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {displayName(c)} ({c.email})
              </option>
            ))}
          </select>

          <select
            required
            value={form.clientId}
            onChange={e => setForm({ ...form, clientId: e.target.value })}
            className="border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">— Select client —</option>
            {clientCandidates.map(u => (
              <option key={u.id} value={u.id}>
                {displayName(u)} ({u.email})
              </option>
            ))}
          </select>

          <button
            disabled={busy || !form.coachId || !form.clientId}
            className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 disabled:opacity-60 text-sm"
          >
            {busy ? 'Assigning…' : 'Assign'}
          </button>
        </form>
        {coaches.length === 0 && (
          <p className="text-xs text-yellow-600 mt-3">
            ⚠️ No coaches exist yet. Promote a user below.
          </p>
        )}
      </section>

      {/* ---------- Current coaches ---------- */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Current Coaches ({coaches.length})
        </h3>
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                <th className="p-3">Name</th>
                <th>Email</th>
                <th>Clients</th>
                <th>Since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {coaches.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-gray-500">No coaches yet.</td></tr>
              )}
              {coaches.map(c => (
                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3 font-medium">{displayName(c)}</td>
                  <td className="text-gray-500">{c.email}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                      {c.clientCount}
                    </span>
                  </td>
                  <td className="text-gray-500">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="text-right pr-3">
                    <button
                      onClick={() => demoteCoach(c.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Demote to user
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Active assignments ---------- */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Active Assignments ({assignments.length})
        </h3>
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                <th className="p-3">Coach</th>
                <th>Client</th>
                <th>Assigned</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-gray-500">No assignments yet.</td></tr>
              )}
              {assignments.map(a => (
                <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3">
                    <div className="font-medium">{a.coach_name || a.coach_email}</div>
                    <div className="text-xs text-gray-500">{a.coach_email}</div>
                  </td>
                  <td>
                    <div className="font-medium">{a.client_name || a.client_email}</div>
                    <div className="text-xs text-gray-500">{a.client_email}</div>
                  </td>
                  <td className="text-gray-500">
                    {new Date(a.assigned_at).toLocaleDateString()}
                  </td>
                  <td className="text-right pr-3">
                    <button
                      onClick={() => remove(a.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Promote users to coach ---------- */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Promote a user to Coach
        </h3>
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                <th className="p-3">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role === 'user').map(u => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3 font-medium">{displayName(u)}</td>
                  <td className="text-gray-500">{u.email}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="text-right pr-3">
                    <button
                      onClick={() => promoteToCoach(u.id)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Make coach
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}