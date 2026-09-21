import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../api';
import Card from '../components/Card';
import Receipt from '../components/Receipt';
import RentalInventory from '../components/admin/RentalInventory';
import ExerciseLibrary from '../components/admin/ExerciseLibrary';
import RevenueChart from '../components/admin/RevenueChart';
import UserDetailModal from '../components/admin/UserDetailModal';
import CoachManagement from '../components/admin/CoachManagement';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Admin() {
  const { user: me } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState('profile');
  const [range, setRange] = useState(30);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [payments, setPayments] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/admin/stats?range=${range}`).then(r => setStats(r.data));
  }, [range]);

  useEffect(() => {
    api.get('/admin/users').then(r => setUsers(r.data));
    api.get('/admin/activity?limit=100').then(r => setActivity(r.data));
    api.get('/payments').then(r => setPayments(r.data));
    api.get('/admin/payments/pending').then(r => setPendingPayments(r.data));
  }, []);

  useEffect(() => {
    const q = filterUser ? `?userId=${filterUser}` : '';
    api.get(`/admin/memberships${q}`).then(r => setMemberships(r.data));
    api.get(`/admin/rentals${q}`).then(r => setRentals(r.data));
  }, [filterUser]);

  const userMap = useMemo(() => {
    const m = {};
    users.forEach(u => { m[u.id] = u; });
    return m;
  }, [users]);

  const displayName = (u) =>
    u.full_name || u.username || u.email || `User #${u.id}`;

  const setRole = async (id, role) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      setUsers(list => list.map(x => (x.id === id ? { ...x, role } : x)));
      showToast(`User #${id} is now ${role}`);
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to update role', 'error');
    }
  };

  const changeMembershipStatus = async (m, newStatus) => {
    const label =
      newStatus === 'active'          ? 'Active'
      : newStatus === 'cancelled'     ? 'Cancelled'
      : 'Cancelled + Refund';

    if (newStatus !== 'active' && !confirm(`Set membership to "${label}" for ${displayName(m)}?`)) return;

    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/memberships/${m.id}/status`, {
        status: newStatus,
      });
      setMemberships(list =>
        list.map(x =>
          x.id === m.id
            ? { ...x, status: newStatus === 'active' ? 'active' : 'cancelled' }
            : x
        )
      );
      const r = data.paymentsRefunded || 0;
      showToast(
        r > 0 ? `Membership → ${label} · ${r} payment(s) refunded`
        : r < 0 ? `Membership → Active · ${Math.abs(r)} payment(s) restored`
        : `Membership → ${label}`
      );
      api.get('/payments').then(res => setPayments(res.data));
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to update', 'error');
    } finally { setBusy(false); }
  };

  const changeRentalStatus = async (r, newStatus) => {
    const label = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

    if (['available', 'cancelled'].includes(newStatus)) {
      if (!confirm(`Set rental of ${r.item_name} to "${label}"?${newStatus === 'cancelled' ? ' Payment will be refunded.' : ' Stock will be restored.'}`)) return;
    }

    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/rentals/${r.id}/status`, {
        status: newStatus,
      });
      setRentals(list =>
        list.map(x => (x.id === r.id ? { ...x, status: newStatus } : x))
      );
      const refunds = data.paymentsRefunded || 0;
      showToast(
        `Rental → ${label}${refunds ? ` · ${refunds} payment refunded` : ''}`
      );
      if (refunds) api.get('/payments').then(res => setPayments(res.data));
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to update', 'error');
    } finally { setBusy(false); }
  };

  const verifyPayment = async (p) => {
    if (!confirm(`Verify ₱${Number(p.amount).toFixed(2)} from ${p.user?.email}?`)) return;
    try {
      await api.patch(`/admin/payments/${p._id}/verify`);
      setPendingPayments(list => list.filter(x => x._id !== p._id));
      api.get('/payments').then(r => setPayments(r.data));
      showToast('Payment verified & user notified.');
    } catch (e) {
      showToast(e.response?.data?.error || 'Verify failed', 'error');
    }
  };

  const rejectPayment = async (p) => {
    const reason = prompt('Reason for rejection (optional):') || '';
    if (!confirm(`Reject ₱${Number(p.amount).toFixed(2)} from ${p.user?.email}?`)) return;
    try {
      await api.patch(`/admin/payments/${p._id}/reject`, { reason });
      setPendingPayments(list => list.filter(x => x._id !== p._id));
      api.get('/payments').then(r => setPayments(r.data));
      showToast('Payment rejected & user notified.', 'info');
    } catch (e) {
      showToast(e.response?.data?.error || 'Reject failed', 'error');
    }
  };

  const adminResend = async (p) => {
    const extra = prompt(
      'Send a copy to additional emails?\n(comma separated, or leave blank for account email only)'
    );
    if (extra === null) return;
    try {
      const { data } = await api.post(`/admin/payments/${p._id}/resend-email`, {
        sendTo: extra || '',
      });
      const extras = (data.additional || []).join(', ');
      showToast(
        extras
          ? `Sent to ${data.sentTo} and ${extras}`
          : `Re-sent to ${data.sentTo}`
      );
    } catch (e) {
      showToast(e.response?.data?.error || 'Resend failed', 'error');
    }
  };

  const openPaymentReceipt = (p) => {
    setReceipt({
      title: p.purpose === 'membership' ? 'Membership Payment'
           : p.purpose === 'rental'     ? 'Equipment Rental'
           : 'Payment',
      amount: p.amount,
      method: p.method,
      reference: p.reference || `TXN-${String(p._id).slice(-8).toUpperCase()}`,
      date: p.createdAt,
      items: [
        { label: 'User', value: `#${p.userId} — ${displayName(userMap[p.userId] || { id: p.userId })}` },
        { label: 'Status', value: p.status },
        ...(p.details?.items || []),
      ],
    });
  };

  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const refundedTotal = payments
    .filter(p => p.status === 'refunded')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const filteredUser = filterUser ? userMap[filterUser] : null;

  const TABS = [
    { id: 'profile',      label: 'PROFILE' },
    { id: 'stats',        label: 'STATS' },
    { id: 'users',        label: 'USERS' },
    { id: 'activity',     label: 'ACTIVITY' },
    { id: 'payments',     label: 'PAYMENTS' },
    { id: 'pending',      label: `PENDING${pendingPayments.length ? ` (${pendingPayments.length})` : ''}` },
    { id: 'transactions', label: 'TRANSACTIONS' },
    { id: 'coaches',      label: 'COACHES' },
    { id: 'inventory',    label: 'INVENTORY' },
    { id: 'exercises',    label: 'EXERCISES' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        {tab === 'stats' && (
          <select
            value={range} onChange={e => setRange(+e.target.value)}
            className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap border-b border-gray-200 dark:border-gray-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== PROFILE ==================== */}
      {tab === 'profile' && (
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
                {(me?.full_name?.[0] || me?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {me?.full_name || me?.username || 'Admin'}
                </h2>
                <p className="text-sm text-white/80">{me?.email}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded bg-yellow-400 text-yellow-900 text-xs font-semibold">
                  ⭐ ADMINISTRATOR
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-3">
              Users who used the website ({users.length})
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {users.map(u => {
                const lastActivity = activity.find(a => a.userId === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => setDetailUser(u.id)}
                    className="text-left p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:border-brand-500 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-200 flex items-center justify-center font-bold shrink-0">
                      {(u.full_name?.[0] || u.username?.[0] || u.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {displayName(u)}
                        {u.id === me?.id && (
                          <span className="text-xs text-brand-600 ml-1">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {lastActivity
                          ? `Last: ${lastActivity.action} · ${new Date(lastActivity.createdAt).toLocaleDateString()}`
                          : 'No activity yet'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : u.role === 'coach'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>{u.role}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ==================== STATS ==================== */}
      {tab === 'stats' && (
        <div className="space-y-8">
          {stats && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card label="Total Users"    value={stats.totalUsers} />
                <Card label="Total Workouts" value={stats.totalWorkouts} />
                <Card
                  label={`Logins (${range}d)`}
                  value={stats.metrics.reduce((s, m) => s + (m.logins || 0), 0)}
                />
              </div>
              <div className="h-80 bg-white dark:bg-gray-900 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold mb-2 px-1">Platform activity</h3>
                <ResponsiveContainer>
                  <BarChart data={stats.metrics}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="logins"          fill="#3b82f6" name="Logins" />
                    <Bar dataKey="registrations"   fill="#10b981" name="Registrations" />
                    <Bar dataKey="workoutsCreated" fill="#f59e0b" name="Workouts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          <section>
            <h3 className="text-xl font-semibold mb-3">Revenue</h3>
            <RevenueChart days={range} />
          </section>
        </div>
      )}

      {/* ==================== USERS ==================== */}
      {tab === 'users' && (
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                <th className="p-3">ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3">{u.id}</td>
                  <td className="font-medium">
                    <button
                      onClick={() => setDetailUser(u.id)}
                      className="hover:text-brand-600 hover:underline"
                    >
                      {displayName(u)}
                    </button>
                  </td>
                  <td className="text-gray-500">{u.email}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : u.role === 'coach'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>{u.role}</span>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td className="text-right pr-3 space-x-3">
                    <button
                      onClick={() => setDetailUser(u.id)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      View
                    </button>
                    {u.id !== me?.id && (
                      u.role === 'user' ? (
                        <button
                          onClick={() => setRole(u.id, 'coach')}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Make coach
                        </button>
                      ) : (
                        <button
                          onClick={() => setRole(u.id, 'user')}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Reset to user
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== ACTIVITY ==================== */}
      {tab === 'activity' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {activity.length === 0 && (
            <p className="p-4 text-gray-500">No activity yet.</p>
          )}
          {activity.map(a => {
            const u = userMap[a.userId];
            return (
              <div key={a._id} className="p-3 text-sm flex justify-between items-center">
                <span>
                  <b>{displayName(u || { id: a.userId })}</b>{' '}
                  <span className="text-gray-500">— {a.action}</span>
                  {a.metadata?.amount && (
                    <span className="text-gray-500">
                      {' '}· ₱{a.metadata.amount} via {a.metadata.method}
                    </span>
                  )}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== PAYMENTS ==================== */}
      {tab === 'payments' && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Card label="Total Payments" value={payments.length} />
            <Card label="Net Revenue"    value={`₱${totalRevenue.toFixed(2)}`} />
            <Card label="Refunded"       value={`₱${refundedTotal.toFixed(2)}`} />
            <Card
              label="Unique Users"
              value={new Set(payments.map(p => p.userId)).size}
            />
          </div>

          <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="p-3">User</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-gray-500">No payments yet.</td></tr>
                )}
                {payments.map(p => (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <button
                        onClick={() => setDetailUser(p.userId)}
                        className="text-left hover:text-brand-600 hover:underline"
                      >
                        <div className="font-medium">
                          {displayName(userMap[p.userId] || { id: p.userId })}
                        </div>
                        <div className="text-xs text-gray-500">#{p.userId}</div>
                      </button>
                    </td>
                    <td className="font-medium">₱{Number(p.amount).toFixed(2)}</td>
                    <td className="uppercase text-xs">{p.method}</td>
                    <td className="capitalize">{p.purpose}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700'
                        : p.status === 'refunded' ? 'bg-red-100 text-red-700'
                        : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>{p.status}</span>
                    </td>
                    <td className="text-gray-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="text-right pr-3">
                      <button
                        onClick={() => openPaymentReceipt(p)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ==================== PENDING PAYMENTS ==================== */}
      {tab === 'pending' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">
              Pending Payments ({pendingPayments.length})
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              These users paid via GCash, Maya, or Bank transfer. Verify once the money arrives.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="p-3">User</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Purpose</th>
                  <th>User confirmed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-gray-500">
                      No pending payments. 🎉
                    </td>
                  </tr>
                )}
                {pendingPayments.map(p => (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <button
                        onClick={() => setDetailUser(p.userId)}
                        className="text-left hover:text-brand-600 hover:underline"
                      >
                        <div className="font-medium">
                          {p.user?.full_name || p.user?.username || p.user?.email || `#${p.userId}`}
                        </div>
                        <div className="text-xs text-gray-500">{p.user?.email}</div>
                      </button>
                    </td>
                    <td className="font-mono text-xs">{p.reference}</td>
                    <td className="font-medium">₱{Number(p.amount).toFixed(2)}</td>
                    <td className="uppercase text-xs">{p.method}</td>
                    <td className="capitalize">{p.purpose}</td>
                    <td>
                      {p.details?.userConfirmedAt ? (
                        <span className="text-xs text-blue-600">
                          ✅ {new Date(p.details.userConfirmedAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="pr-3 space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => adminResend(p)}
                        className="text-xs text-brand-600 hover:underline"
                        title="Resend verification email"
                      >
                        📧 Resend
                      </button>
                      <button
                        onClick={() => verifyPayment(p)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => rejectPayment(p)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TRANSACTIONS ==================== */}
      {tab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">Filter by user:</label>
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 min-w-[240px]"
            >
              <option value="">— All users —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {displayName(u)} ({u.email})
                </option>
              ))}
            </select>
            {filterUser && (
              <button
                onClick={() => setFilterUser('')}
                className="text-xs text-brand-600 hover:underline"
              >
                Clear filter
              </button>
            )}
            {filteredUser && (
              <span className="text-xs text-gray-500 ml-auto">
                Showing transactions for <b>{displayName(filteredUser)}</b>
              </span>
            )}
          </div>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              Memberships ({memberships.length})
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                    <th className="p-3">User</th>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th className="pr-3">Change status</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-gray-500">No memberships.</td></tr>
                  )}
                  {memberships.map(m => (
                    <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-3">
                        <button
                          onClick={() => setDetailUser(m.user_id)}
                          className="text-left hover:text-brand-600 hover:underline"
                        >
                          <div className="font-medium">{displayName(m)}</div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </button>
                      </td>
                      <td className="capitalize">{m.type}</td>
                      <td className="text-gray-500">
                        {m.start_date?.slice(0,10)} → {m.end_date?.slice(0,10)}
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                          m.status === 'active'    ? 'bg-green-100 text-green-700'
                          : m.status === 'cancelled' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>{m.status}</span>
                      </td>
                      <td className="pr-3">
                        <select
                          disabled={busy}
                          value={m.status === 'active' ? 'active' : 'cancelled'}
                          onChange={e => changeMembershipStatus(m, e.target.value)}
                          className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 disabled:opacity-40"
                        >
                          <option value="active">Active</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="cancelled_refund">Cancelled + Refund</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              Rentals ({rentals.length})
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                    <th className="p-3">User</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th className="pr-3">Change status</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-gray-500">No rentals.</td></tr>
                  )}
                  {rentals.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-3">
                        <button
                          onClick={() => setDetailUser(r.user_id)}
                          className="text-left hover:text-brand-600 hover:underline"
                        >
                          <div className="font-medium">{displayName(r)}</div>
                          <div className="text-xs text-gray-500">{r.email}</div>
                        </button>
                      </td>
                      <td>{r.item_name}</td>
                      <td>{r.quantity}</td>
                      <td className="font-medium">₱{Number(r.total_cost).toFixed(2)}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                          r.status === 'available' || r.status === 'returned'
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            : r.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : r.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-700'
                                : r.status === 'hold'
                                  ? 'bg-orange-100 text-orange-700'
                                  : r.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                        }`}>{r.status}</span>
                      </td>
                      <td className="pr-3">
                        <select
                          disabled={busy}
                          value={r.status}
                          onChange={e => changeRentalStatus(r, e.target.value)}
                          className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 disabled:opacity-40"
                        >
                          <option value="reserved">Reserved</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="hold">Hold</option>
                          <option value="available">Available</option>
                          <option value="cancelled">Cancelled + Refund</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ==================== COACHES ==================== */}
      {tab === 'coaches' && <CoachManagement />}

      {/* ==================== INVENTORY ==================== */}
      {tab === 'inventory' && <RentalInventory />}

      {/* ==================== EXERCISES ==================== */}
      {tab === 'exercises' && <ExerciseLibrary />}

      {receipt && <Receipt data={receipt} onClose={() => setReceipt(null)} />}
      {detailUser && (
        <UserDetailModal userId={detailUser} onClose={() => setDetailUser(null)} />
      )}
    </div>
  );
}