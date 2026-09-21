import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Coach() {
  const [me, setMe] = useState(null);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/coaches/me').then(r => setMe(r.data)),
      api.get('/coaches/clients').then(r => setClients(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.full_name || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s) ||
      (c.username || '').toLowerCase().includes(s)
    );
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Coach Dashboard</h1>

      {me && (
        <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
              {(me.coach?.full_name?.[0] || me.coach?.email?.[0] || 'C').toUpperCase()}
            </div>
            <div className="flex-1">
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
            No clients assigned yet. Ask an admin to assign users to you.
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
                      {c.unreadCount} unread
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