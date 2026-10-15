import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function RevokeDeletion() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    api.get(`/revoke/${token}`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || 'Invalid link'));
  }, [token]);

  const revoke = async () => {
    setBusy(true);
    try {
      await api.post(`/revoke/${token}/confirm`);
      setRevoked(true);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to revoke');
    } finally { setBusy(false); }
  };

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-4xl mb-4">❌</p>
          <h1 className="text-xl font-bold">{err}</h1>
          <Link to="/" className="text-brand-600 mt-4 inline-block hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-gray-500">Loading…</div>;

  if (revoked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-4xl mb-4">✅</p>
          <h1 className="text-2xl font-bold text-green-600">Account Saved</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your account will <b>not</b> be deleted. Welcome back, {data.full_name || data.email}!
          </p>
          <Link to="/login" className="inline-block mt-4 w-full bg-brand-600 text-white py-2.5 rounded-lg hover:bg-brand-700 font-medium">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const deletionDate = new Date(data.scheduled_for).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md w-full border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600">Account Deletion Scheduled</h1>
          <p className="text-sm text-gray-500 mt-3">
            An administrator has scheduled your FitForge account (<b>{data.email}</b>) for deletion on:
          </p>
          <p className="text-lg font-semibold text-red-600 mt-2">{deletionDate}</p>
          {data.reason && (
            <p className="text-xs text-gray-500 mt-3 bg-gray-50 dark:bg-gray-800 p-3 rounded">
              <b>Reason:</b> {data.reason}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            All your data — workouts, routines, memberships, and payments — will be lost.
            <br />
            <b>Changed your mind? Click below to save your account.</b>
          </p>
        </div>

        <button
          onClick={revoke}
          disabled={busy}
          className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium disabled:opacity-40"
        >
          {busy ? 'Saving…' : '✓ Keep My Account'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          If you take no action, your account will be permanently deleted.
        </p>
      </div>
    </div>
  );
}
