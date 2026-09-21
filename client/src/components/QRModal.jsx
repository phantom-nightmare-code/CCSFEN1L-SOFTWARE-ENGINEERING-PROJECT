import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import api from '../api';
import { useToast } from '../context/ToastContext';

export default function QRModal({ payment, onClose, onConfirmed }) {
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const url = `${window.location.origin}/verify-payment/${payment.reference}`;
    QRCode.toDataURL(url, { width: 300, margin: 2 })
      .then(setQr)
      .catch(err => console.error('QR failed:', err));
  }, [payment]);

  const confirm = async () => {
    setBusy(true);
    try {
      await api.patch(`/payments/${payment._id}/confirm`);
      showToast('Confirmation sent — admin will verify shortly.');
      onConfirmed?.();
      onClose();
    } catch (e) {
      showToast(e.response?.data?.error || 'Confirm failed', 'error');
    } finally { setBusy(false); }
  };

  const sendCopy = async () => {
    const emails = sendTo.trim();
    if (!emails) return;
    setSending(true);
    try {
      const { data } = await api.post(`/payments/${payment._id}/resend-email`, {
        sendTo: emails,
      });
      const recipients = data.recipients || [];
      showToast(
        recipients.length > 1
          ? `Sent to ${recipients.join(', ')}`
          : `Sent to ${recipients[0] || 'your email'}`
      );
      setSendTo('');
    } catch (e) {
      showToast(e.response?.data?.error || 'Send failed', 'error');
    } finally { setSending(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800 my-8"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center mb-1">Payment Pending</h2>
        <p className="text-xs text-gray-500 text-center mb-4">
          Scan this QR with your phone to see the payment details on that device.
          We've also emailed you a copy.
        </p>

        {qr ? (
          <img
            src={qr}
            alt="Payment QR"
            className="mx-auto w-56 h-56 rounded-lg border border-gray-200 dark:border-gray-700"
          />
        ) : (
          <div className="w-56 h-56 mx-auto flex items-center justify-center text-gray-400">
            Generating QR…
          </div>
        )}

        <div className="mt-4 space-y-2 text-sm">
          <Row label="Reference" value={<span className="font-mono">{payment.reference}</span>} />
          <Row label="Amount"    value={`₱${Number(payment.amount).toFixed(2)}`} />
          <Row label="Method"    value={String(payment.method).toUpperCase()} />
        </div>

        {/* -------- send copy -------- */}
        <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
          <label className="text-xs text-gray-500 block mb-1">
            Send a copy to other email(s) — comma separated
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="friend@example.com, work@example.com"
              value={sendTo}
              onChange={e => setSendTo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendCopy(); }}
              className="flex-1 border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
            />
            <button
              onClick={sendCopy}
              disabled={sending || !sendTo.trim()}
              className="px-3 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded text-sm hover:bg-gray-900 disabled:opacity-40"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Max 5 addresses. A copy is CC'd to the FitForge billing inbox.
          </p>
        </div>

        <button
          onClick={confirm}
          disabled={busy}
          className="w-full mt-5 bg-brand-600 text-white py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? 'Sending…' : "I've sent the payment"}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 text-xs text-gray-500 hover:underline"
        >
          Close
        </button>
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