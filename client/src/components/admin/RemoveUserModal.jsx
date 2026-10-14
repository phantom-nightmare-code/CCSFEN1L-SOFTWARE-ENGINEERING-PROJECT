import { useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function RemoveUserModal({ user, onClose, onRemoved }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  if (!user) return null;

  const confirm = async () => {
    if (reason.trim().length < 5) {
      showToast('Please provide a reason (min 5 characters)', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/admin/users/${user.id}`, {
        data: { reason: reason.trim() },
      });
      showToast(`User ${user.email} removed`);
      onRemoved?.();
      onClose();
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to remove user', 'error');
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
        <h2 className="text-xl font-bold text-red-600 mb-2">Remove User</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          You are about to remove:
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 text-sm">
          <div className="font-medium">
            {user.full_name || user.username || 'Unknown'}
          </div>
          <div className="text-gray-500">{user.email}</div>
          <div className="text-xs text-gray-400 mt-1 capitalize">
            Role: {user.role}
          </div>
        </div>

        <p className="text-xs text-red-600 dark:text-red-400 mb-4">
          ⚠️ This permanently deletes their account and all their data (workouts,
          memberships, rentals, coaching links). This cannot be undone.
        </p>

        <label className="block text-sm font-medium mb-1">
          Reason for removal <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Duplicate account, policy violation, user requested deletion…"
          className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
        />
        <p className="text-xs text-gray-500 mt-1 mb-4">
          This reason will be recorded in the admin audit log.
        </p>

        <div className="flex gap-2">
          <button
            onClick={confirm}
            disabled={busy || reason.trim().length < 5}
            className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-40"
          >
            {busy ? 'Removing…' : 'Remove user'}
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
