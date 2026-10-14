import { useEffect, useState } from 'react';
import api from '../../api';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/admin/audit-log?limit=200')
      .then(r => setLogs(r.data || []))
      .catch(e => setError(e.response?.data?.error || 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !filter ||
    (l.action || '').toLowerCase().includes(filter.toLowerCase()) ||
    (l.admin_email || '').toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="p-4 text-gray-500">Loading audit log…</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">
          Admin Audit Log ({filtered.length})
        </h2>
        <input
          placeholder="Filter by action or admin email…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 md:w-80"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-100 dark:border-gray-800">
              <th className="p-3">When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-gray-500">
                  No audit entries yet. Perform an admin action (like changing a user's role) to see entries here.
                </td>
              </tr>
            )}
            {filtered.map(l => (
              <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString()}
                </td>
                <td className="text-xs">
                  <div className="font-medium">{l.admin_name || l.admin_email}</div>
                  <div className="text-gray-500">{l.admin_email}</div>
                </td>
                <td>
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-mono">
                    {l.action}
                  </span>
                </td>
                <td className="text-xs text-gray-500">
                  {l.target_type ? `${l.target_type} #${l.target_id}` : '—'}
                </td>
                <td className="text-xs text-gray-600 dark:text-gray-400 max-w-md">
                  <span className="line-clamp-2">{l.details || '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
