import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import CoachPaymentReceipt from '../components/CoachPaymentReceipt';

export default function Coach() {
  const { showToast } = useToast();
  const [me, setMe] = useState(null);
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('clients');
  const [loading, setLoading] = useState(true);
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  const load = () => {
    return Promise.all([
      api.get('/coaches/me').then(r => {
        setMe(r.data);
        setRateInput(r.data.coach?.coach_hourly_rate ?? '');
      }),
      api.get('/coaches/clients').then(r => setClients(r.data)),
      api.get('/coaches/requests').then(r => setRequests(r.data)),
      api.get('/coach-payments/received').then(r => setPayments(r.data)).catch(() => {}),
    ]);
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const saveRate = async () => {
    setSavingRate(true);
    try {
      await api.patch('/coach-payments/my-rate', {
        hourly_rate: rateInput === '' ? null : Number(rateInput),
      });
      showToast('Rate updated');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed', 'error');
    } finally { setSavingRate(false); }
  };

  const accept = async (id) => {
    try {
      await api.patch(`/coaches/requests/${id}/accept`);
      showToast('Request accepted'); load();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const decline = async (id) => {
    if (!confirm('Decline this request?')) return;
    try {
      await api.patch(`/coaches/requests/${id}/decline`);
      showToast('Request declined'); load();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const verifyPayment = async (p) => {
    if (!confirm(`Confirm you received ₱${Number(p.amount).toFixed(2)} from ${p.member_name || p.member_email}?`)) return;
    try {
      await api.patch(`/coach-payments/${p.id}/verify`);
      showToast('Payment verified'); load();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const rejectPayment = async (p) => {
    if (!confirm(`Reject this payment from ${p.member_name || p.member_email}?`)) return;
    try {
      await api.patch(`/coach-payments/${p.id}/reject`);
      showToast('Payment rejected'); load();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const openReceipt = (p) => {
    setViewingReceipt({
      reference: p.reference,
      amount: Number(p.amount),
      rate: Number(p.rate),
      hours: Number(p.hours),
      method: p.method,
      coachName: 'You',
      memberName: p.member_name || p.member_username || p.member_email,
      sessionDate: p.session_date?.slice(0, 10),
      notes: p.notes,
      date: p.created_at,
    });
  };

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(s) ||
           (c.email || '').toLowerCase().includes(s) ||
           (c.username || '').toLowerCase().includes(s);
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;

  const totalEarned = payments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const pendingPayments = payments.filter(p => p.status === 'pending');

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
              <h2 className="text-2xl font-bold">{me.coach?.full_name || me.coach?.username || 'Coach'}</h2>
              <p className="text-sm text-white/80">{me.coach?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-yellow-400 text-yellow-900 text-xs font-semibold">🏋️ COACH</span>
                {me.stats.avgRating > 0 && (
                  <span className="px-2 py-0.5 rounded bg-white/20 text-xs">
                    {'⭐'.repeat(Math.round(me.stats.avgRating))} {me.stats.avgRating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{me.stats.clientCount}</div>
              <div className="text-xs text-white/80">active client{me.stats.clientCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Clients"      value={me?.stats.clientCount ?? 0} />
        <StatCard label="Total Earned" value={`₱${totalEarned.toFixed(2)}`} accent="text-green-600" />
        <StatCard label="Avg Rating"   value={me?.stats.avgRating > 0 ? `${me.stats.avgRating.toFixed(1)} ⭐` : '—'} />
        <StatCard label="Reviews"      value={me?.stats.reviewCount ?? 0} />
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4">
        <h3 className="font-semibold mb-3">My Hourly Rate</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-500">₱</span>
          <input type="number" step="0.5" min="0" value={rateInput}
            onChange={e => setRateInput(e.target.value)} placeholder="0.00"
            className="w-32 border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          <span className="text-gray-500 text-sm">per hour</span>
          <button onClick={saveRate} disabled={savingRate}
            className="px-4 py-2 bg-brand-600 text-white rounded text-sm hover:bg-brand-700 disabled:opacity-40">
            {savingRate ? 'Saving…' : 'Save Rate'}
          </button>
          {!rateInput && <span className="text-xs text-yellow-600">⚠️ Set your rate so members can pay you</span>}
        </div>
      </section>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {[
          { id: 'clients',  label: `Clients (${clients.length})` },
          { id: 'requests', label: `Requests${requests.length ? ` (${requests.length})` : ''}` },
          { id: 'payments', label: `Payments (${payments.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.id ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'clients' && (
        <section>
          <div className="flex items-center justify-end mb-3">
            <input placeholder="Search by name or email…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 md:w-72" />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              No clients assigned yet.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(c => (
                <Link key={c.id} to={`/coach/client/${c.id}`}
                  className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 hover:border-brand-500 transition block">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-200 flex items-center justify-center font-bold shrink-0">
                      {(c.full_name?.[0] || c.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{c.full_name || c.username || c.email}</div>
                      <div className="text-xs text-gray-500 truncate">{c.email}</div>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">{c.unreadCount}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="text-gray-500">Workouts</div>
                      <div className="font-semibold text-sm">{c.workoutCount}</div>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="text-gray-500">Last</div>
                      <div className="font-semibold text-sm">{c.lastWorkout ? c.lastWorkout.slice(0, 10) : '—'}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'requests' && (
        <section className="space-y-2">
          {requests.length === 0 && (
            <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              No pending requests.
            </p>
          )}
          {requests.map(r => (
            <div key={r.id} className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.member_name || r.member_username || r.member_email}</div>
                  <div className="text-xs text-gray-500">{r.member_email}</div>
                  {r.message && <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">"{r.message}"</p>}
                  <div className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => accept(r.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                    Accept
                  </button>
                  <button onClick={() => decline(r.id)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm">
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'payments' && (
        <section className="space-y-4">
          {pendingPayments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-400">
                ⏳ Pending Verification ({pendingPayments.length})
              </h3>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-yellow-200 dark:border-yellow-900 divide-y divide-gray-100 dark:divide-gray-800">
                {pendingPayments.map(p => (
                  <div key={p.id} className="p-4 flex justify-between items-center flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💰</span>
                      <div>
                        <div className="font-medium">{p.member_name || p.member_username || p.member_email}</div>
                        <div className="text-xs text-gray-500">
                          {Number(p.hours)} hr × ₱{Number(p.rate).toFixed(2)} · {p.method?.toUpperCase()}
                          {p.user_confirmed_at && <> · ✅ member confirmed</>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-yellow-700">₱{Number(p.amount).toFixed(2)}</div>
                      <button onClick={() => verifyPayment(p)}
                        className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">
                        Confirm Received
                      </button>
                      <button onClick={() => rejectPayment(p)}
                        className="text-xs text-red-600 hover:underline">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Payment History</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                No payments received yet.
              </p>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map(p => (
                  <button key={p.id} onClick={() => openReceipt(p)}
                    className="w-full p-4 flex justify-between items-center text-left hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💰</span>
                      <div>
                        <div className="font-medium">{p.member_name || p.member_username || p.member_email}</div>
                        <div className="text-xs text-gray-500">
                          {Number(p.hours)} hr × ₱{Number(p.rate).toFixed(2)} · {p.method?.toUpperCase()}
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                            p.status === 'paid' ? 'bg-green-100 text-green-700'
                            : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                          }`}>{p.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">+₱{Number(p.amount).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()} ›</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {viewingReceipt && (
        <CoachPaymentReceipt data={viewingReceipt} perspective="coach" onClose={() => setViewingReceipt(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, accent = '' }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 truncate ${accent}`}>{value}</p>
    </div>
  );
}
