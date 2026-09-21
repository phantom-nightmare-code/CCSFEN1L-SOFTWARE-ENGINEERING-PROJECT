import { useEffect, useState } from 'react';
import api from '../../api';

export default function UserDetailModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!userId) return;
    api.get(`/admin/users/${userId}/details`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || 'Failed to load'));
  }, [userId]);

  if (!userId) return null;

  const displayName = (u) => u.full_name || u.username || u.email || `User #${u.id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full my-8 border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {err && <p className="p-6 text-red-500">{err}</p>}
        {!data && !err && <p className="p-6 text-gray-500">Loading…</p>}

        {data && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
                    {(displayName(data.user)[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{displayName(data.user)}</h2>
                    <p className="text-sm text-white/80">{data.user.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                      data.user.role === 'admin'
                        ? 'bg-yellow-400 text-yellow-900'
                        : 'bg-white/20'
                    }`}>
                      {data.user.role.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* KPIs */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <Mini label="Workouts"    value={data.stats.workoutCount} />
                <Mini label="PRs"         value={data.stats.prCount} />
                <Mini label="Memberships" value={data.stats.membershipCount} />
                <Mini label="Rentals"     value={data.stats.rentalCount} />
                <Mini label="Payments"    value={data.stats.paymentCount} />
                <Mini label="Spent"       value={`₱${data.stats.totalSpent.toFixed(0)}`} />
              </div>

              {/* Memberships */}
              <Block title={`Memberships (${data.memberships.length})`}>
                {data.memberships.length === 0 && <Empty />}
                {data.memberships.map(m => (
                  <Row key={m.id}
                    left={<><b className="capitalize">{m.type}</b> — {m.status}</>}
                    right={`${m.start_date?.slice(0,10)} → ${m.end_date?.slice(0,10)}`} />
                ))}
              </Block>

              {/* Rentals */}
              <Block title={`Rentals (${data.rentals.length})`}>
                {data.rentals.length === 0 && <Empty />}
                {data.rentals.map(r => (
                  <Row key={r.id}
                    left={<><b>{r.item_name}</b> × {r.quantity} — {r.status}</>}
                    right={`₱${Number(r.total_cost).toFixed(2)}`} />
                ))}
              </Block>

              {/* Payments */}
              <Block title={`Recent payments (${data.payments.length})`}>
                {data.payments.length === 0 && <Empty />}
                {data.payments.map(p => (
                  <Row key={p._id}
                    left={<><b>₱{Number(p.amount).toFixed(2)}</b> — {p.method} ({p.purpose})</>}
                    right={
                      <span className={`text-xs ${
                        p.status === 'paid' ? 'text-green-600'
                        : p.status === 'refunded' ? 'text-red-600'
                        : 'text-gray-500'
                      }`}>
                        {p.status} · {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    } />
                ))}
              </Block>

              {/* Workouts */}
              <Block title={`Recent workouts (${data.workouts.length})`}>
                {data.workouts.length === 0 && <Empty />}
                {data.workouts.map(w => (
                  <Row key={w.id}
                    left={<><b>{w.name || 'Workout'}</b></>}
                    right={w.workout_date?.slice(0, 10)} />
                ))}
              </Block>

              {/* Activity */}
              <Block title={`Recent activity (${data.activity.length})`}>
                {data.activity.length === 0 && <Empty />}
                {data.activity.map(a => (
                  <Row key={a._id}
                    left={<b>{a.action}</b>}
                    right={new Date(a.createdAt).toLocaleString()} />
                ))}
              </Block>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        {children}
      </div>
    </div>
  );
}

function Row({ left, right }) {
  return (
    <div className="p-2.5 flex justify-between text-sm items-center">
      <span className="min-w-0 truncate">{left}</span>
      <span className="text-gray-500 text-xs shrink-0 ml-3">{right}</span>
    </div>
  );
}

const Empty = () => <p className="p-3 text-xs text-gray-500">None.</p>;