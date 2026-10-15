import { useEffect, useState } from 'react';
import api from '../api';

export default function SuggestedWorkoutFlow({ clientId, endpointPrefix }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    api.get(`${endpointPrefix}/clients/${clientId}/suggested-workout`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [clientId, endpointPrefix]);

  if (loading) return <div className="text-sm text-gray-500">Loading suggestion…</div>;
  if (!data) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
        🎯 Suggested Workout Flow
      </h4>
      <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
        Focus on: <b>{data.focusGroups?.join(', ')}</b>
      </p>
      <div className="space-y-2">
        {(data.exercises || []).map(ex => (
          <div key={ex.id}
            className="flex justify-between items-center text-sm bg-white dark:bg-gray-900 rounded p-2 border border-blue-100 dark:border-blue-900">
            <div>
              <div className="font-medium">{ex.name}</div>
              <div className="text-xs text-gray-500">
                {ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}
              </div>
            </div>
            <div className="text-xs text-gray-500">3 × 10</div>
          </div>
        ))}
      </div>
    </div>
  );
}
