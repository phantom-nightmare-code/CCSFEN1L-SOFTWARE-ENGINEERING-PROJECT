import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

export default function CoachRatingModal({ coach, onClose, onRated }) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    api.get(`/coach-payments/my-rating/${coach.id}`)
      .then(r => {
        if (r.data) {
          setExisting(r.data);
          setRating(r.data.rating);
          setReview(r.data.review || '');
        }
      })
      .catch(() => {});
  }, [coach.id]);

  const submit = async () => {
    if (!rating) {
      showToast('Pick a star rating first', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post('/coach-payments/rate', {
        coachId: coach.id,
        rating,
        review: review.trim() || null,
      });
      showToast(existing ? 'Rating updated' : 'Rating submitted — thanks!');
      onRated?.();
      onClose();
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to rate', 'error');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirm('Remove your rating?')) return;
    setBusy(true);
    try {
      await api.delete(`/coach-payments/my-rating/${coach.id}`);
      showToast('Rating removed');
      onRated?.();
      onClose();
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-1">{existing ? 'Update Rating' : 'Rate Coach'}</h2>
        <p className="text-xs text-gray-500 mb-4">
          Rating <b>{coach.full_name}</b>
        </p>

        {/* Star picker */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className={`text-4xl transition ${
                (hover || rating) >= n ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
              }`}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mb-4">
          {rating > 0 ? `${rating} of 5 stars` : 'Tap a star to rate'}
        </p>

        {/* Review */}
        <label className="text-xs text-gray-500 block mb-1">Review (optional)</label>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          rows={3}
          placeholder="How was your session with this coach?"
          className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 mb-4"
        />

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={busy || !rating}
            className="flex-1 bg-brand-600 text-white py-2 rounded hover:bg-brand-700 disabled:opacity-40"
          >
            {busy ? 'Saving…' : existing ? 'Update Rating' : 'Submit Rating'}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700"
          >
            Cancel
          </button>
        </div>

        {existing && (
          <button
            onClick={remove}
            disabled={busy}
            className="w-full mt-3 text-xs text-red-600 hover:underline"
          >
            Remove my rating
          </button>
        )}
      </div>
    </div>
  );
}
