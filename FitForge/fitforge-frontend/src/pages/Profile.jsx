import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Receipt from '../components/Receipt';

/* ---------- helpers ---------- */

function calcAge(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (isNaN(b)) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (isNaN(end)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - now) / 86400000);
}

export default function Profile() {
  const { user, refresh } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState('overview');
  const [memberships, setMemberships] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', username: '', birthday: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    return Promise.all([
      api.get('/memberships/me').catch(() => ({ data: [] })),
      api.get('/rentals/me').catch(() => ({ data: [] })),
      api.get('/payments/me').catch(() => ({ data: [] })),
    ]).then(([m, r, p]) => {
      setMemberships(m.data);
      setRentals(r.data);
      setPayments(p.data);
    });
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        username: user.username || '',
        birthday: user.birthday ? String(user.birthday).slice(0, 10) : '',
      });
    }
  }, [user]);

  const activeMembership = memberships.find(m => m.status === 'active');
  const activeRentals    = rentals.filter(r => r.status !== 'returned' && r.status !== 'cancelled');

  const paidPayments     = payments.filter(p => p.status === 'paid');
  const refundedPayments = payments.filter(p => p.status === 'refunded');
  const totalSpent       = paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const refundedTotal    = refundedPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const openReceipt = (p) => {
    setSelected({
      title: p.purpose === 'membership' ? 'Membership Payment'
           : p.purpose === 'rental'     ? 'Equipment Rental'
           : 'Payment',
      amount: p.amount,
      method: p.method,
      reference: p.reference || `TXN-${String(p._id).slice(-8).toUpperCase()}`,
      date: p.createdAt,
      items: [
        { label: 'Status', value: p.status },
        ...(p.details?.items || []),
      ],
    });
  };

  const resendEmail = async (p) => {
    const extra = prompt(
      'Send a copy to additional emails?\n(comma separated, or leave blank to resend only to your account)'
    );
    if (extra === null) return;
    try {
      const { data } = await api.post(`/payments/${p._id}/resend-email`, {
        sendTo: extra || '',
      });
      const extras = (data.additional || []).join(', ');
      showToast(
        extras ? `Sent to ${data.sentTo} and ${extras}` : `Re-sent to ${data.sentTo}`
      );
    } catch (e) {
      showToast(e.response?.data?.error || 'Resend failed', 'error');
    }
  };

  const copyEmail = () => {
    navigator.clipboard?.writeText(user?.email || '');
    showToast('Email copied to clipboard', 'info');
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/me', {
        full_name: form.full_name,
        username: form.username,
        birthday: form.birthday || null,
      });
      await refresh();
      showToast('Profile updated');
      setEditing(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading profile…</div>;
  }

  const age = calcAge(user?.birthday);
  const daysLeft = activeMembership ? daysUntil(activeMembership.end_date) : null;
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  const expired = daysLeft !== null && daysLeft < 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      {/* Header */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
            {(user?.full_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {user?.full_name || user?.username || 'FitForge User'}
            </h1>
            <p className="text-sm text-white/80 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
              <span className={`px-2 py-0.5 rounded ${
                user?.role === 'admin'
                  ? 'bg-yellow-400 text-yellow-900 font-semibold'
                  : user?.role === 'coach'
                    ? 'bg-blue-400 text-blue-900 font-semibold'
                    : 'bg-white/20'
              }`}>
                {user?.role === 'admin' ? '⭐ ADMIN'
                 : user?.role === 'coach' ? '🏋️ COACH'
                 : 'MEMBER'}
              </span>
              {age !== null && (
                <span className="px-2 py-0.5 rounded bg-white/20">{age} years old</span>
              )}
              {activeMembership && (
                <span className={`px-2 py-0.5 rounded font-semibold ${
                  expired ? 'bg-red-400 text-red-900'
                  : expiringSoon ? 'bg-orange-400 text-orange-900'
                  : 'bg-green-400 text-green-900'
                }`}>
                  {expired ? '⚠️ EXPIRED'
                   : expiringSoon ? `⏰ ${daysLeft}d LEFT`
                   : `✓ ${activeMembership.type.toUpperCase()} ACTIVE`}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Active membership banner */}
      {activeMembership && (
        <section className={`rounded-2xl shadow border p-5 ${
          expired
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
            : expiringSoon
              ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900'
              : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Active Membership
              </div>
              <div className="text-xl font-bold capitalize mt-1">
                {activeMembership.type} plan
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {activeMembership.start_date?.slice(0, 10)} → {activeMembership.end_date?.slice(0, 10)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                {expired ? 'Expired' : 'Expires in'}
              </div>
              <div className={`text-3xl font-bold ${
                expired ? 'text-red-600'
                : expiringSoon ? 'text-orange-600'
                : 'text-green-600'
              }`}>
                {expired
                  ? `${Math.abs(daysLeft)}d ago`
                  : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
              </div>
              {expiringSoon && !expired && (
                <div className="text-xs text-orange-600 mt-1">
                  Renew soon to keep your access
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Spent"
          value={`₱${totalSpent.toFixed(2)}`}
          accent="text-green-600"
        />
        <SummaryCard
          label="Refunded"
          value={`₱${refundedTotal.toFixed(2)}`}
          accent={refundedTotal > 0 ? 'text-red-600' : ''}
        />
        <SummaryCard
          label="Transactions"
          value={payments.length}
          accent="text-brand-600"
        />
        <SummaryCard
          label="Active Rentals"
          value={activeRentals.length}
          accent="text-yellow-600"
        />
      </section>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {[
          { id: 'overview',     label: 'Overview' },
          { id: 'transactions', label: 'Transactions' },
          { id: 'memberships',  label: 'Memberships' },
          { id: 'rentals',      label: 'Rentals' },
        ].map(t => (
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

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Panel
            title="Account Details"
            action={
              !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Edit
                </button>
              )
            }
          >
            {!editing ? (
              <>
                <DetailRow label="Name"      value={user?.full_name || '—'} />
                <DetailRow label="Username"  value={user?.username || '—'} />
                <DetailRow
                  label="Email"
                  value={
                    <button
                      onClick={copyEmail}
                      className="text-brand-600 hover:underline text-right"
                      title="Click to copy"
                    >
                      {user?.email}
                    </button>
                  }
                />
                <DetailRow label="Birthday"
                  value={user?.birthday ? String(user.birthday).slice(0, 10) : '—'} />
                <DetailRow label="Age"
                  value={age !== null ? `${age} years old` : '—'} />
                <DetailRow label="Role"
                  value={<span className="capitalize">{user?.role}</span>} />
                <DetailRow label="Member since"
                  value={user?.created_at ? String(user.created_at).slice(0, 10) : '—'} />
              </>
            ) : (
              <form onSubmit={saveProfile} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full name</label>
                  <input
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Username</label>
                  <input
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Birthday</label>
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={e => setForm({ ...form, birthday: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  />
                  {form.birthday && (
                    <p className="text-xs text-gray-500 mt-1">
                      Age: {calcAge(form.birthday) ?? '—'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={saving}
                    className="bg-brand-600 text-white px-4 py-2 rounded text-sm hover:bg-brand-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 rounded text-sm border border-gray-300 dark:border-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Panel>

          <Panel title="Membership Status">
            {activeMembership ? (
              <>
                <DetailRow label="Plan"
                  value={<span className="capitalize font-medium">{activeMembership.type}</span>} />
                <DetailRow label="Started"
                  value={activeMembership.start_date?.slice(0, 10)} />
                <DetailRow label="Expires"
                  value={
                    <span className={
                      expired ? 'text-red-600 font-medium'
                      : expiringSoon ? 'text-orange-600 font-medium'
                      : 'text-green-600 font-medium'
                    }>
                      {activeMembership.end_date?.slice(0, 10)}
                      {daysLeft !== null && (
                        <> ({expired ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`})</>
                      )}
                    </span>
                  } />
                <DetailRow label="Status"
                  value={
                    <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                      expired ? 'bg-red-100 text-red-700'
                      : expiringSoon ? 'bg-orange-100 text-orange-700'
                      : 'bg-green-100 text-green-700'
                    }`}>{activeMembership.status}</span>
                  } />
              </>
            ) : (
              <p className="text-sm text-gray-500">
                No active membership.{' '}
                <a href="/membership" className="text-brand-600 hover:underline">
                  Subscribe
                </a>
              </p>
            )}
            <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
              <DetailRow
                label="Active rentals"
                value={
                  activeRentals.length === 0
                    ? <span className="text-gray-500">None</span>
                    : <span className="text-yellow-600 font-medium">
                        {activeRentals.length} item{activeRentals.length > 1 ? 's' : ''}
                      </span>
                }
              />
              <DetailRow
                label="Latest payment"
                value={
                  payments[0]
                    ? <button
                        onClick={() => openReceipt(payments[0])}
                        className="text-brand-600 hover:underline"
                      >
                        ₱{Number(payments[0].amount).toFixed(2)} · {payments[0].method}
                      </button>
                    : <span className="text-gray-500">None</span>
                }
              />
            </div>
          </Panel>
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <section>
          <p className="text-xs text-gray-500 mb-2">
            Click any row to view its receipt. Pending payments have a Resend option.
          </p>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800">
            {payments.length === 0 && <Empty text="No transactions yet." />}
            {payments.map(p => (
              <div
                key={p._id}
                className="p-4 flex justify-between items-center text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <button
                  onClick={() => openReceipt(p)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <span className="text-2xl shrink-0">
                    {p.purpose === 'membership' ? '💳'
                     : p.purpose === 'rental'   ? '🏋️'
                     : '💰'}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium capitalize flex items-center gap-2 flex-wrap">
                      {p.purpose} — {String(p.method).toUpperCase()}
                      {p.status === 'refunded' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          REFUNDED
                        </span>
                      )}
                      {p.status === 'pending' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                          PENDING
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {p.status === 'pending' && (
                    <button
                      onClick={() => resendEmail(p)}
                      className="text-xs text-brand-600 hover:underline"
                      title="Resend verification email"
                    >
                      📧 Resend
                    </button>
                  )}
                  <button onClick={() => openReceipt(p)} className="text-right">
                    <div className={`font-bold ${
                      p.status === 'refunded' ? 'text-red-600 line-through' : 'text-green-600'
                    }`}>
                      ₱{Number(p.amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">{p.status} ›</div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Memberships */}
      {tab === 'memberships' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800">
          {memberships.length === 0 && <Empty text="No memberships yet." />}
          {memberships.map(m => {
            const d = daysUntil(m.end_date);
            const isExpired = d !== null && d < 0;
            return (
              <div key={m.id} className="p-4 flex justify-between items-center text-sm">
                <div>
                  <div className="font-medium capitalize">{m.type} plan</div>
                  <div className="text-xs text-gray-500">
                    {m.start_date?.slice(0,10)} → {m.end_date?.slice(0,10)}
                    {d !== null && (
                      <> · {isExpired ? `expired ${Math.abs(d)}d ago` : `${d}d left`}</>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                  m.status === 'active'
                    ? (isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')
                    : m.status === 'cancelled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {isExpired && m.status === 'active' ? 'expired' : m.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Rentals */}
      {tab === 'rentals' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800">
          {rentals.length === 0 && <Empty text="No rentals yet." />}
          {rentals.map(r => (
            <div key={r.id} className="p-4 flex justify-between items-center text-sm">
              <div>
                <div className="font-medium">{r.item_name} × {r.quantity}</div>
                <div className="text-xs text-gray-500">
                  {r.start_time ? new Date(r.start_time).toLocaleString() : '—'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">₱{Number(r.total_cost).toFixed(2)}</div>
                <div className={`text-xs capitalize ${
                  r.status === 'returned' || r.status === 'available' ? 'text-gray-500'
                  : r.status === 'active' || r.status === 'confirmed' ? 'text-green-600'
                  : r.status === 'cancelled' ? 'text-red-600'
                  : 'text-yellow-600'
                }`}>{r.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Receipt data={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/* ---------- presentational helpers ---------- */

function SummaryCard({ label, value, accent = '' }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 truncate ${accent}`}>{value}</p>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-sm py-1">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

const Empty = ({ text }) => (
  <p className="p-4 text-sm text-gray-500">{text}</p>
);