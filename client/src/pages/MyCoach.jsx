import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

export default function MyCoach() {
  const { showToast } = useToast();
  const [coaches, setCoaches] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    return Promise.all([
      api.get('/my-coach').then(r => {
        setCoaches(r.data.coaches || []);
        setUnread(r.data.unreadCount || 0);
      }),
      api.get('/my-coach/feedback').then(r => setFeedback(r.data || [])),
    ]);
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/my-coach/feedback/${id}/read`);
      setFeedback(list =>
        list.map(f => (f.id === id ? { ...f, read_at: new Date().toISOString() } : f))
      );
      setUnread(u => Math.max(0, u - 1));
    } catch {
      showToast('Failed to mark read', 'error');
    }
  };

  const markAllRead = async () => {
    try {
      const { data } = await api.patch('/my-coach/feedback/read-all');
      showToast(`Marked ${data.changed} as read`);
      load();
    } catch {
      showToast('Failed', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">My Coach</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
            Mark all read
          </button>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {coaches.length === 0
            ? 'No coach assigned yet'
            : `Assigned coach${coaches.length > 1 ? 'es' : ''} (${coaches.length})`}
        </h2>
        {coaches.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            Ask an admin to assign you to a coach.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {coaches.map(c => (
              <div key={c.id}
                className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-200 flex items-center justify-center font-bold shrink-0">
                  {(c.full_name?.[0] || c.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {c.full_name || c.username || c.email}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{c.email}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Coach · assigned {new Date(c.assigned_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          Feedback from your coach
          {unread > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              {unread} new
            </span>
          )}
        </h2>

        <div className="space-y-3">
          {feedback.length === 0 && (
            <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              No feedback yet. Your coach will post here once you've trained.
            </p>
          )}
          {feedback.map(f => {
            const isUnread = !f.read_at;
            return (
              <div
                key={f.id}
                className={`p-5 rounded-xl shadow border transition ${
                  isUnread
                    ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      {f.subject || 'Feedback'}
                      {isUnread && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      From <b>{f.coach_name || f.coach_email}</b> ·{' '}
                      {new Date(f.created_at).toLocaleString()}
                      {f.workout_name && (
                        <> · on <b>{f.workout_name}</b> ({f.workout_date?.slice(0, 10)})</>
                      )}
                    </div>
                  </div>
                  {f.rating && <div className="text-sm shrink-0">{'⭐'.repeat(f.rating)}</div>}
                </div>

                <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 mt-2">
                  {f.content}
                </p>

                {isUnread && (
                  <button
                    onClick={() => markRead(f.id)}
                    className="mt-3 text-xs text-brand-600 hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}