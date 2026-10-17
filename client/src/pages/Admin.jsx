import { useEffect, useMemo, useRef, useState } from 'react';
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
import CoachRatingsManager from '../components/admin/CoachRatingsManager';
import AuditLog from '../components/admin/AuditLog';
import RemoveUserModal from '../components/admin/RemoveUserModal';
import ClearPaymentsModal from '../components/admin/ClearPaymentsModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Admin() {
  const { user: me } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState('profile');
  const [coachSubTab, setCoachSubTab] = useState('manage');
  const [paymentsSubTab, setPaymentsSubTab] = useState('platform');
  const [range, setRange] = useState(30);
  const [stats, setStats] = useState(null);
  const [aggregate, setAggregate] = useState(null);
  const [users, setUsers] = useState([]);
  const [pendingDeletions, setPendingDeletions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [payments, setPayments] = useState([]);
  const [coachPayments, setCoachPayments] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [removeUser, setRemoveUser] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  const loadAll = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [aggr, usr, act, pay, pend, del, cpay] = await Promise.all([
        api.get('/admin/stats/aggregate').then(r => r.data),
        api.get('/admin/users').then(r => r.data),
        api.get('/admin/activity?limit=100').then(r => r.data),
        api.get('/payments').then(r => r.data),
        api.get('/admin/payments/pending').then(r => r.data),
        api.get('/admin/users/pending-deletions').then(r => r.data).catch(() => []),
        api.get('/admin/coach-payments').then(r => r.data).catch(() => null),
      ]);
      setAggregate(aggr);
      setUsers(usr);
      setActivity(act);
      setPayments(pay);
      setPendingPayments(pend);
      setPendingDeletions(del);
      setCoachPayments(cpay);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Admin load failed:', err.message);
    } finally { setRefreshing(false); }
  };

  const loadStatsOnly = async () => {
    try {
      const [aggr, pay, pend, del, cpay] = await Promise.all([
        api.get('/admin/stats/aggregate').then(r => r.data),
        api.get('/payments').then(r => r.data),
        api.get('/admin/payments/pending').then(r => r.data),
        api.get('/admin/users/pending-deletions').then(r => r.data).catch(() => []),
        api.get('/admin/coach-payments').then(r => r.data).catch(() => null),
      ]);
      setAggregate(aggr);
      setPayments(pay);
      setPendingPayments(pend);
      setPendingDeletions(del);
      setCoachPayments(cpay);
      setLastRefreshed(new Date());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { api.get(`/admin/stats?range=${range}`).then(r => setStats(r.data)); }, [range]);
  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    const i = setInterval(() => {
      if (['profile','payments','pending'].includes(tabRef.current)) loadStatsOnly();
    }, 30000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    const q = filterUser ? `?userId=${filterUser}` : '';
    api.get(`/admin/memberships${q}`).then(r => setMemberships(r.data));
    api.get(`/admin/rentals${q}`).then(r => setRentals(r.data));
  }, [filterUser]);

  const userMap = useMemo(() => {
    const m = {}; users.forEach(u => { m[u.id] = u; }); return m;
  }, [users]);

  const displayName = (u) => u.full_name || u.username || u.email || `User #${u.id}`;

  const setRole = async (id, role) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      setUsers(list => list.map(x => x.id === id ? { ...x, role } : x));
      showToast(`User #${id} is now ${role}`);
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const cancelRemoval = async (id) => {
    if (!confirm('Cancel the scheduled deletion for this user?')) return;
    try {
      await api.patch(`/admin/users/${id}/cancel-removal`);
      showToast('Deletion cancelled');
      loadStatsOnly();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const forceDelete = async (id) => {
    if (!confirm('Permanently delete this user NOW? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}/force`);
      showToast('User permanently deleted');
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const changeMembershipStatus = async (m, newStatus) => {
    const label = newStatus === 'active' ? 'Active' : newStatus === 'cancelled' ? 'Cancelled'
                : newStatus === 'pending' ? 'Pending' : 'Cancelled + Refund';
    if (newStatus !== 'active' && !confirm(`Set membership to "${label}" for ${displayName(m)}?`)) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/memberships/${m.id}/status`, { status: newStatus });
      setMemberships(list => list.map(x =>
        x.id === m.id ? {
          ...x,
          status: newStatus === 'cancelled_refund' ? 'cancelled' : newStatus,
          has_refund: newStatus === 'cancelled_refund' ? true : x.has_refund,
        } : x
      ));
      const r = data.paymentsRefunded || 0;
      showToast(r > 0 ? `Membership → ${label} · ${r} refunded`
        : r < 0 ? `Membership → Active · ${Math.abs(r)} restored`
        : `Membership → ${label}`);
      loadStatsOnly();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const changeRentalStatus = async (r, newStatus) => {
    const label = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    if (['available','cancelled'].includes(newStatus)) {
      if (!confirm(`Set rental of ${r.item_name} to "${label}"?`)) return;
    }
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/rentals/${r.id}/status`, { status: newStatus });
      setRentals(list => list.map(x => x.id === r.id ? { ...x, status: newStatus } : x));
      const refunds = data.paymentsRefunded || 0;
      showToast(`Rental → ${label}${refunds ? ` · ${refunds} refunded` : ''}`);
      loadStatsOnly();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const verifyPayment = async (p) => {
    if (!confirm(`Verify ₱${Number(p.amount).toFixed(2)} from ${p.user?.email}?`)) return;
    try {
      await api.patch(`/admin/payments/${p._id}/verify`);
      setPendingPayments(list => list.filter(x => x._id !== p._id));
      loadStatsOnly();
      showToast('Payment verified');
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const rejectPayment = async (p) => {
    const reason = prompt('Reason for rejection (optional):') || '';
    if (!confirm(`Reject ₱${Number(p.amount).toFixed(2)} from ${p.user?.email}?`)) return;
    try {
      await api.patch(`/admin/payments/${p._id}/reject`, { reason });
      setPendingPayments(list => list.filter(x => x._id !== p._id));
      loadStatsOnly();
      showToast('Payment rejected');
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const adminResend = async (p) => {
    const extra = prompt('Send a copy to additional emails?\n(comma separated)');
    if (extra === null) return;
    try {
      const { data } = await api.post(`/admin/payments/${p._id}/resend-email`, { sendTo: extra || '' });
      const extras = (data.additional || []).join(', ');
      showToast(extras ? `Sent to ${data.sentTo} and ${extras}` : `Re-sent to ${data.sentTo}`);
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const openPaymentReceipt = (p) => {
    setReceipt({
      title: p.purpose === 'membership' ? 'Membership Payment'
           : p.purpose === 'rental'     ? 'Equipment Rental' : 'Payment',
      amount: p.amount, method: p.method,
      reference: p.reference || `TXN-${String(p._id).slice(-8).toUpperCase()}`,
      date: p.createdAt,
      items: [
        { label: 'User', value: `#${p.userId} — ${displayName(userMap[p.userId] || { id: p.userId })}` },
        { label: 'Status', value: p.status },
        ...(p.details?.items || []),
      ],
    });
  };

  const openCoachPaymentReceipt = (p) => {
    setReceipt({
      title: 'Coach Payment',
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      date: p.created_at,
      items: [
        { label: 'Member', value: p.member_name || p.member_email },
        { label: 'Coach', value: p.coach_name || p.coach_email },
        { label: 'Rate', value: `₱${Number(p.rate).toFixed(2)}/hr` },
        { label: 'Hours', value: p.hours },
        { label: 'Status', value: p.status },
        ...(p.session_date ? [{ label: 'Session', value: p.session_date.slice(0, 10) }] : []),
      ],
    });
  };

  const filteredUser = filterUser ? userMap[filterUser] : null;

  const TABS = [
    { id: 'profile',      label: 'PROFILE' },
    { id: 'stats',        label: 'STATS' },
    { id: 'users',        label: 'USERS' },
    { id: 'deletions',    label: `DELETIONS${pendingDeletions.length ? ` (${pendingDeletions.length})` : ''}` },
    { id: 'activity',     label: 'ACTIVITY' },
    { id: 'audit',        label: 'AUDIT LOG' },
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
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          {lastRefreshed && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 30s
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadAll()} disabled={refreshing}
            className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center gap-2">
            <span className={refreshing ? 'inline-block animate-spin' : ''}>🔄</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          {tab === 'stats' && (
            <select value={range} onChange={e => setRange(+e.target.value)}
              className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          )}
        </div>
      </div>

      {/* Compact tab bar — one row */}
      <div className="flex items-center gap-1 flex-wrap border-b border-gray-200 dark:border-gray-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-2.5 py-1.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.id ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PROFILE */}
      {tab === 'profile' && (
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
                {(me?.full_name?.[0] || me?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{me?.full_name || me?.username || 'Admin'}</h2>
                <p className="text-sm text-white/80">{me?.email}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded bg-yellow-400 text-yellow-900 text-xs font-semibold">⭐ ADMINISTRATOR</span>
              </div>
            </div>
          </section>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold">Platform-wide Statistics</h3>
              <button onClick={loadStatsOnly} className="text-xs text-brand-600 hover:underline">🔄 Refresh</button>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <Card label="Total Spent (all users)"  value={aggregate ? `₱${Number(aggregate.totalSpent).toFixed(2)}` : '…'} />
              <Card label="Refunded (all users)"     value={aggregate ? `₱${Number(aggregate.totalRefunded).toFixed(2)}` : '…'} />
              <Card label="Transactions (all users)" value={aggregate ? aggregate.totalTransactions : '…'} />
              <Card label="Active Rentals (all users)" value={aggregate ? aggregate.activeRentals : '…'} />
            </div>
          </section>
          <section>
            <h3 className="text-xl font-semibold mb-3">Users who used the website ({users.length})</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {users.map(u => {
                const lastActivity = activity.find(a => a.userId === u.id);
                return (
                  <button key={u.id} onClick={() => setDetailUser(u.id)}
                    className="text-left p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:border-brand-500 transition">
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-200 flex items-center justify-center font-bold shrink-0">
                      {(u.full_name?.[0] || u.username?.[0] || u.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{displayName(u)}{u.id === me?.id && <span className="text-xs text-brand-600 ml-1">(you)</span>}</div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {lastActivity ? `Last: ${lastActivity.action} · ${new Date(lastActivity.createdAt).toLocaleDateString()}` : 'No activity yet'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700'
                      : u.role === 'coach' ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>{u.role}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* STATS */}
      {tab === 'stats' && (
        <div className="space-y-8">
          {stats && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card label="Total Users"    value={stats.totalUsers} />
                <Card label="Total Workouts" value={stats.totalWorkouts} />
                <Card label={`Logins (${range}d)`} value={stats.metrics.reduce((s, m) => s + (m.logins || 0), 0)} />
              </div>
              <div className="h-80 bg-white dark:bg-gray-900 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold mb-2 px-1">Platform activity</h3>
                <ResponsiveContainer>
                  <BarChart data={stats.metrics}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis /><Tooltip />
                    <Bar dataKey="logins" fill="#3b82f6" name="Logins" />
                    <Bar dataKey="registrations" fill="#10b981" name="Registrations" />
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

      {/* USERS */}
      {tab === 'users' && (
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                <th className="p-3">ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3">{u.id}</td>
                  <td className="font-medium">
                    <button onClick={() => setDetailUser(u.id)} className="hover:text-brand-600 hover:underline">
                      {displayName(u)}
                    </button>
                  </td>
                  <td className="text-gray-500">{u.email}</td>
                  <td>
                    <select value={u.role} onChange={e => setRole(u.id, e.target.value)}
                      disabled={u.id === me?.id}
                      className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 disabled:opacity-40 cursor-pointer">
                      <option value="user">User</option>
                      <option value="coach">Coach</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td className="text-right pr-3 whitespace-nowrap">
                    <button onClick={() => setDetailUser(u.id)} className="text-xs text-brand-600 hover:underline mr-3">View</button>
                    {u.id !== me?.id && u.role !== 'admin' && (
                      <button onClick={() => setRemoveUser(u)} className="text-xs text-red-600 hover:underline">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DELETIONS */}
      {tab === 'deletions' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Scheduled for Deletion ({pendingDeletions.length})</h2>
          <p className="text-xs text-gray-500">
            Users received an email with a revocation link. If they don't revoke, force-delete them after the deadline.
          </p>
          {pendingDeletions.length === 0 && (
            <p className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-500">
              No pending deletions. 🎉
            </p>
          )}
          {pendingDeletions.map(d => {
            const deadline = new Date(d.pending_deletion_at);
            const daysLeft = Math.ceil((deadline - new Date()) / 86400000);
            const overdue = daysLeft < 0;
            return (
              <div key={d.id} className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{displayName(d)}</div>
                    <div className="text-xs text-gray-500">{d.email} · #{d.id}</div>
                    {d.deletion_reason && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <b>Reason:</b> {d.deletion_reason}
                      </p>
                    )}
                    <div className={`text-xs mt-2 ${overdue ? 'text-red-600 font-semibold' : 'text-yellow-600'}`}>
                      {overdue
                        ? `⚠️ Deadline passed ${Math.abs(daysLeft)} day(s) ago`
                        : `Deletes in ${daysLeft} day(s) — ${deadline.toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => cancelRemoval(d.id)}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                      Cancel Removal
                    </button>
                    <button onClick={() => forceDelete(d.id)}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                      Force Delete Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACTIVITY */}
      {tab === 'activity' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {activity.length === 0 && <p className="p-4 text-gray-500">No activity yet.</p>}
          {activity.map(a => {
            const u = userMap[a.userId];
            return (
              <div key={a._id} className="p-3 text-sm flex justify-between items-center">
                <span>
                  <b>{displayName(u || { id: a.userId })}</b>{' '}
                  <span className="text-gray-500">— {a.action}</span>
                  {a.metadata?.amount && <span className="text-gray-500"> · ₱{a.metadata.amount} via {a.metadata.method}</span>}
                </span>
                <span className="text-gray-500 text-xs">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'audit' && <AuditLog />}

      {/* PAYMENTS */}
      {tab === 'payments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
              <button onClick={() => setPaymentsSubTab('platform')}
                className={`px-3 py-1.5 text-sm font-medium border-b-2 transition ${
                  paymentsSubTab === 'platform' ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                Platform Payments
              </button>
              <button onClick={() => setPaymentsSubTab('coach')}
                className={`px-3 py-1.5 text-sm font-medium border-b-2 transition ${
                  paymentsSubTab === 'coach' ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                Coach Payments
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadStatsOnly} className="text-xs text-brand-600 hover:underline">🔄 Refresh</button>
              {paymentsSubTab === 'platform' && (
                <button onClick={() => setShowClearModal(true)} className="text-xs text-red-600 hover:underline">🗑 Clear All Payments</button>
              )}
            </div>
          </div>

          {/* PLATFORM PAYMENTS */}
          {paymentsSubTab === 'platform' && (
            <>
              <div className="grid md:grid-cols-5 gap-4">
                <Card label="Total Payments" value={aggregate ? aggregate.totalTransactions : '…'} />
                <Card label="Net Revenue"    value={aggregate ? `₱${Number(aggregate.totalSpent).toFixed(2)}` : '…'} />
                <Card label="Refunded"       value={aggregate ? `₱${Number(aggregate.totalRefunded).toFixed(2)}` : '…'} />
                <Card label="Refunded Transactions" value={aggregate ? aggregate.refundedTransactionsCount : '…'} />
                <Card label="Unique Users"   value={aggregate ? aggregate.uniqueUsersCount : '…'} />
              </div>
              <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                      <th className="p-3">User</th><th>Amount</th><th>Method</th><th>Purpose</th><th>Status</th><th>Date</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 && <tr><td colSpan={7} className="p-4 text-gray-500">No payments yet.</td></tr>}
                    {payments.map(p => (
                      <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="p-3">
                          <button onClick={() => setDetailUser(p.userId)} className="text-left hover:text-brand-600 hover:underline">
                            <div className="font-medium">{displayName(userMap[p.userId] || { id: p.userId })}</div>
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
                        <td className="text-gray-500">{new Date(p.createdAt).toLocaleString()}</td>
                        <td className="text-right pr-3">
                          <button onClick={() => openPaymentReceipt(p)} className="text-xs text-brand-600 hover:underline">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* COACH PAYMENTS */}
          {paymentsSubTab === 'coach' && coachPayments && (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                <Card label="Total Transactions" value={coachPayments.stats.totalCount} />
                <Card label="Total Paid to Coaches" value={`₱${coachPayments.stats.totalPaid.toFixed(2)}`} />
                <Card label="Pending Verification"  value={`₱${coachPayments.stats.totalPending.toFixed(2)}`} />
                <Card label="Active Coaches Paid"   value={coachPayments.stats.uniqueCoaches} />
              </div>

              {/* Per-coach breakdown */}
              {coachPayments.byCoach.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold mb-2">Earnings by Coach</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {coachPayments.byCoach.map(c => (
                      <div key={c.coach_id}
                        className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
                        <div className="font-semibold truncate">{c.coach_name}</div>
                        <div className="text-xs text-gray-500 truncate">{c.coach_email}</div>
                        <div className="flex justify-between mt-3 text-sm">
                          <span className="text-gray-500">Earned</span>
                          <span className="font-bold text-green-600">₱{c.earned.toFixed(2)}</span>
                        </div>
                        {c.pending > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Pending</span>
                            <span className="font-medium text-yellow-600">₱{c.pending.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Sessions</span>
                          <span>{c.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Full transaction table */}
              <section>
                <h3 className="text-lg font-semibold mb-2">
                  All Coach Payments ({coachPayments.payments.length})
                </h3>
                <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                        <th className="p-3">Member</th>
                        <th>Coach</th>
                        <th>Amount</th>
                        <th>Rate / Hours</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachPayments.payments.length === 0 && (
                        <tr><td colSpan={8} className="p-4 text-gray-500">No coach payments yet.</td></tr>
                      )}
                      {coachPayments.payments.map(p => (
                        <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="p-3">
                            <div className="font-medium">{p.member_name || p.member_username || p.member_email}</div>
                            <div className="text-xs text-gray-500">#{p.member_id}</div>
                          </td>
                          <td>
                            <div className="font-medium">{p.coach_name || p.coach_username || p.coach_email}</div>
                            <div className="text-xs text-gray-500">#{p.coach_id}</div>
                          </td>
                          <td className="font-medium">₱{Number(p.amount).toFixed(2)}</td>
                          <td className="text-xs text-gray-500">
                            ₱{Number(p.rate).toFixed(2)} × {p.hours} hr
                          </td>
                          <td className="uppercase text-xs">{p.method}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              p.status === 'paid' ? 'bg-green-100 text-green-700'
                              : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                            }`}>{p.status}</span>
                          </td>
                          <td className="text-gray-500">{new Date(p.created_at).toLocaleString()}</td>
                          <td className="text-right pr-3">
                            <button onClick={() => openCoachPaymentReceipt(p)} className="text-xs text-brand-600 hover:underline">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* PENDING */}
      {tab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Pending Payments ({pendingPayments.length})</h2>
              <p className="text-xs text-gray-500 mt-1">Verify once the money arrives.</p>
            </div>
            <button onClick={loadStatsOnly} className="text-xs text-brand-600 hover:underline">🔄 Refresh</button>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="p-3">User</th><th>Reference</th><th>Amount</th><th>Method</th><th>Purpose</th><th>User confirmed</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-gray-500">No pending payments. 🎉</td></tr>
                )}
                {pendingPayments.map(p => (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <button onClick={() => setDetailUser(p.userId)} className="text-left hover:text-brand-600 hover:underline">
                        <div className="font-medium">{p.user?.full_name || p.user?.username || p.user?.email || `#${p.userId}`}</div>
                        <div className="text-xs text-gray-500">{p.user?.email}</div>
                      </button>
                    </td>
                    <td className="font-mono text-xs">{p.reference}</td>
                    <td className="font-medium">₱{Number(p.amount).toFixed(2)}</td>
                    <td className="uppercase text-xs">{p.method}</td>
                    <td className="capitalize">{p.purpose}</td>
                    <td>
                      {p.details?.userConfirmedAt ? (
                        <span className="text-xs text-blue-600">✅ {new Date(p.details.userConfirmedAt).toLocaleString()}</span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="pr-3 space-x-3 whitespace-nowrap">
                      <button onClick={() => adminResend(p)} className="text-xs text-brand-600 hover:underline">📧 Resend</button>
                      <button onClick={() => verifyPayment(p)} className="text-xs text-green-600 hover:underline">Verify</button>
                      <button onClick={() => rejectPayment(p)} className="text-xs text-red-600 hover:underline">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      {tab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">Filter by user:</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 min-w-[240px]">
              <option value="">— All users —</option>
              {users.map(u => <option key={u.id} value={u.id}>{displayName(u)} ({u.email})</option>)}
            </select>
            {filterUser && <button onClick={() => setFilterUser('')} className="text-xs text-brand-600 hover:underline">Clear filter</button>}
            {filteredUser && <span className="text-xs text-gray-500 ml-auto">Showing for <b>{displayName(filteredUser)}</b></span>}
          </div>

          <section>
            <h3 className="text-lg font-semibold mb-3">Memberships ({memberships.length})</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                    <th className="p-3">User</th><th>Type</th><th>Period</th><th>Status</th><th className="pr-3">Change status</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.length === 0 && <tr><td colSpan={5} className="p-4 text-gray-500">No memberships.</td></tr>}
                  {memberships.map(m => {
                    const dv = m.status === 'cancelled' && m.has_refund ? 'cancelled_refund' : m.status;
                    return (
                      <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="p-3">
                          <button onClick={() => setDetailUser(m.user_id)} className="text-left hover:text-brand-600 hover:underline">
                            <div className="font-medium">{displayName(m)}</div>
                            <div className="text-xs text-gray-500">{m.email}</div>
                          </button>
                        </td>
                        <td className="capitalize">{m.type}</td>
                        <td className="text-gray-500">{m.start_date?.slice(0,10)} → {m.end_date?.slice(0,10)}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                            m.status === 'active' ? 'bg-green-100 text-green-700'
                            : m.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                            : m.status === 'cancelled' ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>{m.status === 'cancelled' && m.has_refund ? 'cancelled + refund' : m.status}</span>
                        </td>
                        <td className="pr-3">
                          <select disabled={busy} value={dv} onChange={e => changeMembershipStatus(m, e.target.value)}
                            className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 disabled:opacity-40">
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="cancelled_refund">Cancelled + Refund</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Rentals ({rentals.length})</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                    <th className="p-3">User</th><th>Item</th><th>Qty</th><th>Total</th><th>Status</th><th className="pr-3">Change status</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.length === 0 && <tr><td colSpan={6} className="p-4 text-gray-500">No rentals.</td></tr>}
                  {rentals.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-3">
                        <button onClick={() => setDetailUser(r.user_id)} className="text-left hover:text-brand-600 hover:underline">
                          <div className="font-medium">{displayName(r)}</div>
                          <div className="text-xs text-gray-500">{r.email}</div>
                        </button>
                      </td>
                      <td>{r.item_name}</td><td>{r.quantity}</td>
                      <td className="font-medium">₱{Number(r.total_cost).toFixed(2)}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                          ['available','returned'].includes(r.status) ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          : r.status === 'active' ? 'bg-green-100 text-green-700'
                          : r.status === 'confirmed' ? 'bg-blue-100 text-blue-700'
                          : ['hold','reserved'].includes(r.status) ? 'bg-orange-100 text-orange-700'
                          : r.status === 'cancelled' ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>{r.status}</span>
                      </td>
                      <td className="pr-3">
                        <select disabled={busy} value={r.status} onChange={e => changeRentalStatus(r, e.target.value)}
                          className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 disabled:opacity-40">
                          <option value="reserved">Reserved</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="hold">Hold</option>
                          <option value="active">Active</option>
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

      {/* COACHES */}
      {tab === 'coaches' && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
            <button onClick={() => setCoachSubTab('manage')}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 transition ${
                coachSubTab === 'manage' ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>Assign & Promote</button>
            <button onClick={() => setCoachSubTab('ratings')}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 transition ${
                coachSubTab === 'ratings' ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>Ratings</button>
          </div>
          {coachSubTab === 'manage' && <CoachManagement />}
          {coachSubTab === 'ratings' && <CoachRatingsManager />}
        </div>
      )}

      {tab === 'inventory' && <RentalInventory />}
      {tab === 'exercises' && <ExerciseLibrary />}

      {receipt && <Receipt data={receipt} onClose={() => setReceipt(null)} />}
      {detailUser && <UserDetailModal userId={detailUser} onClose={() => setDetailUser(null)} />}

      {showClearModal && (
        <ClearPaymentsModal onClose={() => setShowClearModal(false)}
          onCleared={() => { setShowClearModal(false); loadAll(); }} />
      )}

      {removeUser && (
        <RemoveUserModal user={removeUser}
          onClose={() => setRemoveUser(null)}
          onRemoved={() => {
            setUsers(list => list.filter(x => x.id !== removeUser.id));
            setRemoveUser(null);
            loadStatsOnly();
          }} />
      )}
    </div>
  );
}
