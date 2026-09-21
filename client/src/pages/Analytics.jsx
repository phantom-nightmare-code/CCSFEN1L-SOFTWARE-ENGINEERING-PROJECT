import { useEffect, useState } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import api from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [volume, setVolume] = useState([]);
  const [prs, setPrs] = useState([]);
  const [muscles, setMuscles] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    setErr('');
    Promise.all([
      api.get(`/analytics/volume?days=${days}`),
      api.get('/analytics/prs'),
      api.get(`/analytics/muscle-balance?days=${days}`),
    ])
      .then(([v, p, m]) => {
        setVolume(v.data.map(r => ({ ...r, volume: Number(r.volume) || 0 })));
        setPrs(p.data);
        setMuscles(m.data.map(r => ({ ...r, volume: Number(r.volume) || 0 })));
      })
      .catch(e => setErr(e.response?.data?.error || 'Failed to load analytics'));
  }, [days]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <select
          value={days} onChange={e => setDays(+e.target.value)}
          className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {err && <p className="text-red-500 text-sm">{err}</p>}

      <section className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="font-semibold mb-3">Volume over time (kg lifted)</h2>
        {volume.length === 0 ? (
          <p className="text-sm text-gray-500">No workout data yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="font-semibold mb-3">Muscle balance</h2>
        {muscles.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={muscles}
                  dataKey="volume"
                  nameKey="muscle_group"
                  cx="50%" cy="50%" outerRadius={90}
                  label={(entry) => entry.muscle_group}
                >
                  {muscles.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="font-semibold mb-3">Personal records</h2>
        {prs.length === 0 ? (
          <p className="text-sm text-gray-500">No PRs yet — log some workouts!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                <th className="py-2">Exercise</th>
                <th>Muscle</th>
                <th className="text-right">1RM (kg)</th>
                <th className="text-right">Achieved</th>
              </tr>
            </thead>
            <tbody>
              {prs.map((p, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2">{p.name}</td>
                  <td className="text-gray-500">{p.muscle_group}</td>
                  <td className="text-right font-medium">{Number(p.best_1rm).toFixed(1)}</td>
                  <td className="text-right text-gray-500">
                    {p.achieved_at?.slice(0, 10) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}