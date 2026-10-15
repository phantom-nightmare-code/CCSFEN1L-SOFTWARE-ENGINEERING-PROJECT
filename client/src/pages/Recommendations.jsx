import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Recommendations() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/recommendations')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || 'Failed to load'));
  }, []);

  if (err)  return <div className="p-8 text-red-500">{err}</div>;
  if (!data) return <div className="p-8 text-center">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Recommended for You</h1>

      <section className="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-[240px]">
          <h2 className="text-xl font-bold mb-1">Want a proper training plan?</h2>
          <p className="text-sm text-white/90">
            Ask a coach today for daily instructions tailored to your goals.
          </p>
        </div>
        <Link
          to="/my-coach"
          className="px-5 py-2.5 bg-white text-brand-700 font-semibold rounded-lg hover:bg-gray-100 transition"
        >
          Ask a Coach →
        </Link>
      </section>

      {data.message && <p className="text-gray-600 dark:text-gray-400">{data.message}</p>}

      {data.neglected?.length > 0 && (
        <p className="text-gray-600 dark:text-gray-400">
          You've been neglecting: <b>{data.neglected.join(', ')}</b>
        </p>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {data.suggestions?.map(s => (
          <div key={s.id}
            className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold">{s.name}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {s.muscle_group}{s.equipment ? ` · ${s.equipment}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
