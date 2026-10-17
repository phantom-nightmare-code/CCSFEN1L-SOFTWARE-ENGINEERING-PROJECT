import { useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function ClearPaymentsModal({ onClose, onCleared }) {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const canDelete = confirmText === 'DELETE ALL TRANSACTIONS';

  const clear = async () => {
    if (!canDelete) return;
    setBusy(true);
    try {
      const { data } = await api.delete('/admin/payments/clear-all', {
        data: { confirmText },
      });
      showToast(data.message || `Cleared ${data.deletedCount} records`);
      onCleared?.();
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to clear payments', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-red-600 mb-2">
          ⚠️ Clear All Transactions
        </h2>

        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-3 mb-4 text-sm text-red-800 dark:text-red-200">
          <p className="font-medium mb-1">This action is permanent.</p>
          <p className="text-xs">It will delete:</p>
          <ul className="text-xs list-disc ml-5 mt-1 space-y-0.5">
            <li>All platform payments and coach payment records for every user</li>
            <li>All membership and rental records shown in Transactions</li>
            <li>All daily revenue metrics</li>
          </ul>
          <p className="text-xs mt-2 font-medium">
            User and coach totals will return to zero. Reserved rental stock is restored. Users, workouts, and rental inventory are retained.
          </p>
        </div>

        <label className="block text-sm font-medium mb-1">
          Type <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">DELETE ALL TRANSACTIONS</code> to confirm:
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="DELETE ALL TRANSACTIONS"
          className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 mb-4 font-mono"
          autoFocus
        />

        <div className="flex gap-2">
          <button
            onClick={clear}
            disabled={!canDelete || busy}
            className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-40"
          >
            {busy ? 'Clearing…' : 'Clear All Transactions'}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
