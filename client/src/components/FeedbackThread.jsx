import { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const REACTION_EMOJIS = ['👍', '💪', '🔥', '❤️', '😮', '😂'];

export default function FeedbackThread({ feedback, onUpdate, canClose, endpointPrefix }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

  const isCoach = user?.role === 'coach' || user?.role === 'admin';
  const closed = !!feedback.closed_at;

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`${endpointPrefix}/feedback/${feedback.id}/replies`, {
        content: reply.trim(),
      });
      const updated = {
        ...feedback,
        replies: [...(feedback.replies || []), data],
      };
      onUpdate(updated);
      setReply('');
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to send reply', 'error');
    } finally { setSending(false); }
  };

  const toggleReaction = async (emoji) => {
    if (closed) return;
    setBusy(true);
    try {
      await api.post(`${endpointPrefix}/feedback/${feedback.id}/react`, { emoji });
      const reactions = [...(feedback.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (idx === -1) reactions.push({ emoji, count: 1, mine: true });
      else if (reactions[idx].mine) {
        reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, mine: false };
        if (reactions[idx].count === 0) reactions.splice(idx, 1);
      } else {
        reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, mine: true };
      }
      onUpdate({ ...feedback, reactions });
    } catch (e) {
      showToast(e.response?.data?.error || 'Reaction failed', 'error');
    } finally { setBusy(false); }
  };

  const closeThread = async () => {
    if (!confirm('Close this feedback? Replies and reactions will be locked.')) return;
    try {
      await api.patch(`${endpointPrefix}/feedback/${feedback.id}/close`);
      showToast('Feedback closed');
      onUpdate({ ...feedback, closed_at: new Date().toISOString(), closed_by: user.id });
    } catch (e) {
      showToast(e.response?.data?.error || 'Close failed', 'error');
    }
  };

  const deleteFeedback = async () => {
    if (!confirm('Delete this feedback and all replies?')) return;
    try {
      await api.delete(`${endpointPrefix}/feedback/${feedback.id}`);
      showToast('Feedback deleted');
      onUpdate({ ...feedback, _deleted: true });
    } catch (e) {
      showToast(e.response?.data?.error || 'Delete failed', 'error');
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${
      closed
        ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-semibold flex items-center gap-2 flex-wrap">
            {feedback.subject || 'Feedback'}
            {feedback.rating && <span className="text-sm">{'⭐'.repeat(feedback.rating)}</span>}
            {closed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                🔒 CLOSED
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {feedback.coach_name && <>From <b>{feedback.coach_name}</b> · </>}
            {new Date(feedback.created_at).toLocaleString()}
            {feedback.workout_name && <> · on <b>{feedback.workout_name}</b></>}
          </div>
        </div>
        {isCoach && (
          <div className="flex gap-2 shrink-0">
            {!closed && canClose && (
              <button onClick={closeThread} className="text-xs text-gray-600 dark:text-gray-400 hover:underline">
                🔒 Close
              </button>
            )}
            <button onClick={deleteFeedback} className="text-xs text-red-600 hover:underline">
              🗑
            </button>
          </div>
        )}
      </div>

      <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200 my-3">
        {feedback.content}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {REACTION_EMOJIS.map(emoji => {
          const r = (feedback.reactions || []).find(x => x.emoji === emoji);
          const count = r?.count || 0;
          const mine = r?.mine || false;
          if (count === 0 && closed) return null;
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              disabled={closed || busy}
              className={`text-xs px-2 py-1 rounded-full border transition ${
                mine
                  ? 'bg-brand-100 dark:bg-brand-900 border-brand-500 text-brand-700 dark:text-brand-200'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
              } disabled:opacity-50`}
            >
              {emoji} {count > 0 && <span className="ml-0.5">{count}</span>}
            </button>
          );
        })}
      </div>

      {(feedback.replies || []).length > 0 && (
        <div className="space-y-2 pl-4 border-l-2 border-gray-100 dark:border-gray-800 my-3">
          {feedback.replies.map(r => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <b className={r.author_role === 'coach' ? 'text-brand-600' : ''}>
                  {r.author_name || (r.author_role === 'coach' ? 'Coach' : 'Member')}
                </b>
                <span>·</span>
                <span>{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {r.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {!closed && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendReply(); }}
            placeholder={isCoach ? 'Reply as coach…' : 'Reply…'}
            className="flex-1 border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          />
          <button
            onClick={sendReply}
            disabled={sending || !reply.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded text-sm hover:bg-brand-700 disabled:opacity-40"
          >
            {sending ? '…' : 'Reply'}
          </button>
        </div>
      )}
    </div>
  );
}
