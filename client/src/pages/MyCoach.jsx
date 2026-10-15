import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import FeedbackThread from '../components/FeedbackThread';

export default function MyCoach() {
  const { showToast } = useToast();
  const [coaches, setCoaches] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [unread, setUnread] = useState(0);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requesting, setRequesting] = useState(false);

  const load = () => {
    return Promise.all([
      api.get('/my-coach').then(r => {
        setCoaches(r.data.coaches || []);
        setUnread(r.data.unreadCount || 0);
        setPendingRequests(r.data.pendingRequests || []);
      }),
      api.get('/my-coach/feedback').then(r => setFeedback(r.data || [])),
    ]);
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const submitRequest = async () => {
    setRequesting(true);
    try {
      await api.post('/my-coach/request', { message: requestMessage });
      showToast('Coach request sent!');
      setShowRequestModal(false);
      setRequestMessage('');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Request failed', 'error');
    } finally { setRequesting(false); }
  };

  const cancelRequest = async (id) => {
    if (!confirm('Cancel this coach request?')) return;
    try {
      await api.delete(`/my-coach/request/${id}`);
      showToast('Request cancelled');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Cancel failed', 'error');
    }
  };

  const markAllRead = async () => {
    try {
      const { data } = await api.patch('/my-coach/feedback/read-all');
      showToast(`Marked ${data.changed} as read`);
      load();
    } catch { showToast('Failed', 'error'); }
  };

  const updateFeedback = (updated) => {
    if (updated._deleted) {
      setFeedback(list => list.filter(f => f.id !== updated.id));
    } else {
      setFeedback(list => list.map(f => f.id === updated.id ? updated : f));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;

  const hasCoach = coaches.length > 0;
  const hasPending = pendingRequests.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">My Coach</h1>
        <div className="flex items-center gap-3">
          {!hasCoach && !hasPending && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 text-sm"
            >
              + Request a Coach
            </button>
          )}
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
              Mark all read
            </button>
          )}
        </div>
      </div>

      {hasPending && (
        <section className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4">
          <h2 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⏳ Pending Coach Request{hasPending ? 's' : ''}
          </h2>
          {pendingRequests.map(pr => (
            <div key={pr.id} className="flex justify-between items-center text-sm py-1">
              <div>
                <div>Waiting for a coach to accept</div>
                <div className="text-xs text-gray-500">
                  Requested {new Date(pr.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => cancelRequest(pr.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {coaches.length === 0
            ? 'No coach assigned yet'
            : `Your coach${coaches.length > 1 ? 'es' : ''}`}
        </h2>
        {coaches.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            {hasPending
              ? 'Your request is waiting to be accepted by a coach.'
              : 'Click "+ Request a Coach" above to get assigned to a trainer.'}
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
                  <div className="font-semibold truncate">{c.full_name || c.username || c.email}</div>
                  <div className="text-xs text-gray-500 truncate">{c.email}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Assigned {new Date(c.assigned_at).toLocaleDateString()}
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
          {feedback.map(f => (
            <FeedbackThread
              key={f.id}
              feedback={f}
              onUpdate={updateFeedback}
              endpointPrefix="/my-coach"
              canClose={false}
            />
          ))}
        </div>
      </section>

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Request a Coach</h2>
            <p className="text-sm text-gray-500 mb-4">
              Tell us what you'd like help with. A coach will accept your request soon.
            </p>
            <textarea
              value={requestMessage}
              onChange={e => setRequestMessage(e.target.value)}
              rows={4}
              placeholder="e.g. Want to improve squat form and build a 3-day split."
              className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={submitRequest}
                disabled={requesting}
                className="flex-1 bg-brand-600 text-white py-2 rounded hover:bg-brand-700 disabled:opacity-40"
              >
                {requesting ? 'Sending…' : 'Send Request'}
              </button>
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
