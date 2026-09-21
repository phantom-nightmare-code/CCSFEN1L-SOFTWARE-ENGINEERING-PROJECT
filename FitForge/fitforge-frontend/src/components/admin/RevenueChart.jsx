import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import api from '../../api';

const METHOD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function RevenueChart({ days = 30 }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setErr('');
    api.get(`/admin/revenue?days=${days}`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || 'Failed to load revenue'));
  }, [days]);

  if (err) return <p className="text-red-500 text-sm">{err}</p>;
  if (!data) return <p className="text-gray-500 text-sm">Loading revenue…</p>;

  const daily = data.daily.map(d => ({ date: d._id, total: d.total, count: d.count }));
  const methodData = data.byMethod.map(m => ({
    name: String(m._id).toUpperCase(),
    value: m.total,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={`Revenue (${days}d)`} value={`₱${Number(data.grandTotal).toFixed(2)}`} accent="text-green-600" />
        <Kpi label="Transactions" value={data.daily.reduce((s, d) => s + d.count, 0)} />
        <Kpi label="Top Method" value={data.byMethod[0] ? String(data.byMethod[0]._id).toUpperCase() : '—'} />
        <Kpi label="Top Purpose" value={data.byPurpose[0]?. _id || '—'} />
      </div>

      <section className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
        <h3 className="font-semibold mb-3">Daily revenue</h3>
        {daily.length === 0 ? (
          <p className="text-sm text-gray-500">No payments in this period.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis />
                <Tooltip formatter={(v) => `₱${Number(v).toFixed(2)}`} />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="font-semibold mb-3">By payment method</h3>
          {methodData.length === 0 ? (
            <p className="text-sm text-gray-500">No data.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={methodData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%" outerRadius={80}
                    label={(e) => `${e.name}: ₱${Number(e.value).toFixed(0)}`}
                  >
                    {methodData.map((_, i) => (
                      <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₱${Number(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="font-semibold mb-3">By purpose</h3>
          {data.byPurpose.length === 0 ? (
            <p className="text-sm text-gray-500">No data.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={data.byPurpose.map(p => ({
                  name: String(p._id).toUpperCase(),
                  total: p.total,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis />
                  <Tooltip formatter={(v) => `₱${Number(v).toFixed(2)}`} />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent = '' }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 truncate ${accent}`}>{value}</p>
    </div>
  );
}