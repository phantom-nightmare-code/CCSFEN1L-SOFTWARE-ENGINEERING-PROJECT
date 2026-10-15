import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';

export default function Coach() {
  const { showToast } = useToast();
  const [me, setMe] = useState(null);
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    return Promise.all([
      api.get('/coaches/me').then(r => setMe(r.data)),
      api.get('/coaches/clients').then(r => setClients(r.data)),
      api.get('/coaches/requests').then(r => setRequests(r.data)),
    ]);
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const accept = async (id) => {
    try {
      await api.patch(`/coaches/requests/${id}/accept`);
      showToast('Request accepted');
      load();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const decline = async (id) => {
    if (!confirm('Decline this request?')) return;
    try {
      await api.patch(`/coaches/requests/${id}/decline`);
      showToast('Request declined');
      load();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(s) ||
           (c.email || '').toLowerCase().includes(s) ||
           (c.username || '').toLowerCase().includes(s);
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Coach Dashboard</h1>

      {me && (
        <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
              {(me.coach?.full_name?.[0] || me.coach?.email?.[0] || 'C').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold">
                {me.coach?.full_name || me.coach?.username || 'Coach'}
              </h2>
              <p className="text-sm text-white/80">{me.coach?.email}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-yellow-400 text-yellow-900 text-xs font-semibold">
                🏋️ COACH
              </span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{me.stats.clientCount}</div>
              <div className="text-xs text-white/80">
                active client{me.stats.clientCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </section>
      )}

      {requests.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            📥 New Coach Requests
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              {requests.length}
            </span>
          </h2>
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id}
                className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {r.member_name || r.member_username || r.member_email}
                    </div>
                    <div className="text-xs text-gray-500">{r.member_email}</div>
                    {r.message && (
                      <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                        "{r.message}"
                      </p>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => accept(r.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => decline(r.id)}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="text-xl font-semibold">My Clients ({filtered.length})</h3>
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 md:w-72"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            No clients assigned yet. Accept a request above or ask an admin to assign.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(c => (
              <Link
                key={c.id}
                to={`/coach/client/${c.id}`}
                className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 hover:border-brand-500 transition block"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-200 flex items-center justify-center font-bold shrink-0">
                    {(c.full_name?.[0] || c.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {c.full_name || c.username || c.email}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{c.email}</div>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-gray-500">Workouts</div>
                    <div className="font-semibold text-sm">{c.workoutCount}</div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-gray-500">Last</div>
                    <div className="font-semibold text-sm">
                      {c.lastWorkout ? c.lastWorkout.slice(0, 10) : '—'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
