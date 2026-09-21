import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';

export default function CoachClient() {
  const { id } = useParams();
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    subject: '',
    content: '',
    rating: '',
    workoutId: '',
  });
  const [sending, setSending] = useState(false);

  const load = () => {
    return Promise.all([
      api.get(`/coaches/clients/${id}`).then(r => setData(r.data)),
      api.get(`/coaches/clients/${id}/workouts`).then(r => setWorkouts(r.data)),
      api.get(`/coaches/clients/${id}/feedback`).then(r => setFeedback(r.data)),
    ]);
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSending(true);
    try {
      await api.post('/coaches/feedback', {
        clientId: Number(id),
        workoutId: form.workoutId ? Number(form.workoutId) : null,
        subject: form.subject || null,
        content: form.content,
        rating: form.rating ? Number(form.rating) : null,
      });
      showToast('Feedback sent');
      setForm({ subject: '', content: '', rating: '', workoutId: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send', 'error');
    } finally { setSending(false); }
  };

  const removeFeedback = async (fid) => {
    if (!confirm('Delete this feedback?')) return;
    try {
      await api.delete(`/coaches/feedback/${fid}`);
      showToast('Feedback deleted');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Not found</div>;

  const { client, stats, membership, recentPRs } = data;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      {/* Back link */}
      <Link to="/coach" className="text-sm text-brand-600 hover:underline">← All clients</Link>

      {/* Client header */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
            {(client.full_name?.[0] || client.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {client.full_name || client.username || 'Client'}
            </h1>
            <p className="text-sm text-white/80 truncate">{client.email}</p>
            {membership && (
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-semibold ${
                membership.status === 'active'
                  ? 'bg-green-400 text-green-900'
                  : 'bg-white/20'
              }`}>
                {membership.type?.toUpperCase()} · {membership.status}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Workouts"   value={stats.workoutCount} />
        <Stat label="PRs"        value={stats.prCount} />
        <Stat label="Feedback"   value={stats.feedbackCount} />
        <Stat label="Member Since" value={client.created_at?.slice(0, 10)} />
      </section>

      {/* Two-column: workouts + feedback form */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Workouts */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Recent workouts</h3>
          {workouts.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              No workouts logged yet.
            </p>
          ) : (
            <div className="space-y-2">
              {workouts.slice(0, 8).map(w => (
                <div key={w.id} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                    className="w-full p-4 text-left flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{w.name || 'Workout'}</div>
                      <div className="text-xs text-gray-500">{w.workout_date?.slice(0, 10)}</div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {w.sets?.length || 0} sets {expanded === w.id ? '▲' : '▼'}
                    </span>
                  </button>
                  {expanded === w.id && (
                    <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1">
                      {w.sets?.map(s => (
                        <div key={s.id} className="text-sm flex justify-between">
                          <span>{s.exercise_name}</span>
                          <span className="text-gray-500">
                            {s.weight ?? '—'} kg × {s.reps ?? '—'} reps
                          </span>
                        </div>
                      ))}
                      {(!w.sets || w.sets.length === 0) && (
                        <p className="text-xs text-gray-500">No sets recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {recentPRs?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Recent PRs</h4>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {recentPRs.map((p, i) => (
                  <div key={i} className="p-3 text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-gray-500">
                      {Number(p.best_1rm).toFixed(1)} kg · {p.achieved_at?.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Feedback form + history */}
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Send feedback</h3>
            <form
              onSubmit={submit}
              className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4 space-y-3"
            >
              <input
                placeholder="Subject (optional)"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
              <select
                value={form.workoutId}
                onChange={e => setForm({ ...form, workoutId: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">— Attach to a workout (optional) —</option>
                {workouts.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name || 'Workout'} ({w.workout_date?.slice(0, 10)})
                  </option>
                ))}
              </select>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Rating (optional)</label>
                <select
                  value={form.rating}
                  onChange={e => setForm({ ...form, rating: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">No rating</option>
                  <option value="1">⭐ 1</option>
                  <option value="2">⭐⭐ 2</option>
                  <option value="3">⭐⭐⭐ 3</option>
                  <option value="4">⭐⭐⭐⭐ 4</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5</option>
                </select>
              </div>
              <textarea
                required
                placeholder="Your coaching notes…"
                rows={5}
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
              <button
                disabled={sending}
                className="w-full bg-brand-600 text-white py-2 rounded hover:bg-brand-700 disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send feedback'}
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Sent feedback ({feedback.length})</h3>
            {feedback.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                No feedback sent to this client yet.
              </p>
            ) : (
              <div className="space-y-2">
                {feedback.map(f => (
                  <div key={f.id} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{f.subject || 'Feedback'}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(f.created_at).toLocaleString()}
                          {f.workout_name && <> · {f.workout_name}</>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {f.rating && <span className="text-xs">{'⭐'.repeat(f.rating)}</span>}
                        <button
                          onClick={() => removeFeedback(f.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                      {f.content}
                    </p>
                    {f.read_at && (
                      <p className="text-[10px] text-green-600 mt-2">✓ Read</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1 truncate">{value}</p>
    </div>
  );
}