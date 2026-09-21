import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function VerifyPayment() {
  const { reference } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/payments/verify/${reference}`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || 'Payment not found'));
  };

  useEffect(load, [reference]);

  const confirm = async () => {
    if (!data?.payment?._id) return;
    setBusy(true);
    try {
      await api.patch(`/payments/${data.payment._id}/confirm`);
      showToast('Confirmation sent — admin will verify shortly.');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Confirmation failed', 'error');
    } finally { setBusy(false); }
  };

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md text-center border border-gray-100 dark:border-gray-800">
          <p className="text-4xl mb-4">❌</p>
          <h1 className="text-xl font-bold">{err}</h1>
          <Link to="/" className="text-brand-600 mt-4 inline-block hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-gray-500">Loading…</div>;

  const { payment, user: payer } = data;
  const alreadyConfirmed = payment.details?.userConfirmedAt;
  const isVerified = payment.status === 'paid';
  const isRejected = payment.status === 'failed';

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md w-full border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-center">Payment Verification</h1>
        <p className="text-xs text-gray-500 text-center mb-6 font-mono">{reference}</p>

        <div className="space-y-3 text-sm">
          <Row label="Account" value={payer.email} />
          <Row label="Amount"  value={`₱${Number(payment.amount).toFixed(2)}`} />
          <Row label="Method"  value={String(payment.method).toUpperCase()} />
          <Row label="Purpose" value={payment.purpose} />
          <Row label="Status"  value={
            isVerified ? <span className="text-green-600 font-medium">Verified</span>
            : isRejected ? <span className="text-red-600 font-medium">Rejected</span>
            : alreadyConfirmed
              ? <span className="text-blue-600 font-medium">Awaiting admin verification</span>
              : <span className="text-yellow-600 font-medium">Pending</span>
          } />
        </div>

        {!user && !isVerified && !isRejected && (
          <p className="mt-6 text-xs text-center text-gray-500">
            <Link to="/login" className="text-brand-600 hover:underline">Log in</Link> to confirm this payment.
          </p>
        )}

        {user && !isVerified && !isRejected && !alreadyConfirmed && (
          <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
            <p className="text-xs text-gray-500 mb-3 text-center">
              Already sent the money? Let us know and our admin will verify it.
            </p>
            <button
              onClick={confirm}
              disabled={busy}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? 'Confirming…' : "I've sent the payment"}
            </button>
          </div>
        )}

        {user && alreadyConfirmed && !isVerified && (
          <p className="mt-6 text-sm text-center text-blue-600">
            ✅ You confirmed this payment. Waiting for admin approval.
          </p>
        )}

        {isVerified && (
          <p className="mt-6 text-sm text-center text-green-600">
            ✅ This payment has been verified. Thank you!
          </p>
        )}

        {isRejected && (
          <p className="mt-6 text-sm text-center text-red-600">
            ❌ This payment was rejected. Please contact support.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}