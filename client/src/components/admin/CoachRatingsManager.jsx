import { useEffect, useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function CoachRatingsManager() {
  const { showToast } = useToast();
  const [coaches, setCoaches] = useState([]);
  const [selectedCoachId, setSelectedCoachId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);

  useEffect(() => {
    api.get('/admin/coaches')
      .then(r => {
        setCoaches(r.data);
        if (r.data[0]) setSelectedCoachId(r.data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadRatings = (coachId) => {
    if (!coachId) return;
    api.get(`/admin/coaches/${coachId}/ratings`).then(r => setData(r.data));
  };

  useEffect(() => { loadRatings(selectedCoachId); }, [selectedCoachId]);

  const saveEdit = async () => {
    if (!editRow) return;
    try {
      await api.patch(`/admin/coaches/${editRow.coachId}/ratings/${editRow.id}`, {
        rating: Number(editRow.rating),
        review: editRow.review || null,
      });
      showToast('Rating updated');
      setEditRow(null);
      loadRatings(selectedCoachId);
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed', 'error');
    }
  };

  const deleteRating = async (ratingId) => {
    if (!confirm('Delete this rating?')) return;
    try {
      await api.delete(`/admin/coaches/${selectedCoachId}/ratings/${ratingId}`);
      showToast('Rating deleted');
      loadRatings(selectedCoachId);
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed', 'error');
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Coach Ratings</h2>
        <select
          value={selectedCoachId || ''}
          onChange={e => setSelectedCoachId(Number(e.target.value))}
          className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 min-w-[240px]"
        >
          {coaches.length === 0 && <option value="">— No coaches —</option>}
          {coaches.map(c => (
            <option key={c.id} value={c.id}>
              {c.full_name || c.username || c.email}
            </option>
          ))}
        </select>
      </div>

      {!data ? (
        <p className="text-sm text-gray-500">Select a coach to view ratings.</p>
      ) : (
        <>
          {/* Coach summary */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-lg">
                  {data.coach.full_name || data.coach.username}
                </div>
                <div className="text-xs text-gray-500">{data.coach.email}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-500">
                  {data.stats.avgRating > 0
                    ? `${data.stats.avgRating.toFixed(1)} ⭐`
                    : '—'}
                </div>
                <div className="text-xs text-gray-500">
                  {data.stats.total} rating{data.stats.total !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Ratings table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="p-3">Member</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.ratings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-gray-500">
                      No ratings yet for this coach.
                    </td>
                  </tr>
                )}
                {data.ratings.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <div className="font-medium">{r.member_name || r.member_username}</div>
                      <div className="text-xs text-gray-500">{r.member_email}</div>
                    </td>
                    <td>
                      {editRow?.id === r.id ? (
                        <select
                          value={editRow.rating}
                          onChange={e => setEditRow({ ...editRow, rating: e.target.value })}
                          className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700"
                        >
                          {[1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{'⭐'.repeat(n)} {n}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-yellow-500">{'⭐'.repeat(r.rating)}</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                      {editRow?.id === r.id ? (
                        <input
                          value={editRow.review || ''}
                          onChange={e => setEditRow({ ...editRow, review: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700"
                          placeholder="Review"
                        />
                      ) : (
                        <span className="line-clamp-2">{r.review || '—'}</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right pr-3 whitespace-nowrap">
                      {editRow?.id === r.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="text-xs text-green-600 hover:underline mr-3"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditRow(null)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditRow({
                              id: r.id,
                              coachId: selectedCoachId,
                              rating: r.rating,
                              review: r.review,
                            })}
                            className="text-xs text-brand-600 hover:underline mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRating(r.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
