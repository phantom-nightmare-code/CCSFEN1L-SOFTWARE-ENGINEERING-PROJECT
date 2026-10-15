import { useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import CoachPaymentReceipt from './CoachPaymentReceipt';

const METHODS = [
  { value: 'cash',  label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya',  label: 'Maya / PayMaya' },
  { value: 'bank',  label: 'Bank transfer' },
  { value: 'card',  label: 'Credit / Debit card' },
];

export default function CoachPaymentModal({ coach, onClose, onPaid }) {
  const { showToast } = useToast();
  const [hours, setHours] = useState('1');
  const [method, setMethod] = useState('cash');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [qrPayment, setQrPayment] = useState(null);

  const rate = coach?.hourly_rate || 0;
  const hoursNum = Number(hours) || 0;
  const total = rate * hoursNum;

  const submit = async (e) => {
    e.preventDefault();
    if (!rate) { showToast('Coach has not set a rate', 'error'); return; }
    if (!hoursNum || hoursNum <= 0) { showToast('Enter valid hours', 'error'); return; }

    setBusy(true);
    try {
      const { data } = await api.post('/coach-payments', {
        coachId: coach.id,
        hours: hoursNum,
        method,
        session_date: sessionDate,
        notes,
      });

      if (data.status === 'pending' && data.qrDataUrl) {
        // Show QR + confirm button
        setQrPayment({
          id: data.id,
          qr: data.qrDataUrl,
          reference: data.reference,
          amount: data.amount,
          rate: data.rate,
          hours: data.hours,
          method,
          coachName: coach.full_name,
          sessionDate,
        });
        showToast('QR emailed to you — scan and confirm when paid');
      } else {
        showToast(`Paid ₱${data.amount.toFixed(2)} to ${coach.full_name}`);
        setReceipt({
          reference: data.reference,
          amount: data.amount, rate: data.rate, hours: data.hours,
          method, coachName: coach.full_name, memberName: 'You',
          sessionDate, notes, date: new Date(),
        });
        onPaid?.();
      }
    } catch (e) {
      showToast(e.response?.data?.error || 'Payment failed', 'error');
    } finally { setBusy(false); }
  };

  const confirmQr = async () => {
    if (!qrPayment) return;
    try {
      await api.patch(`/coach-payments/${qrPayment.id}/confirm`);
      showToast('Confirmation sent — coach will verify shortly');
      setReceipt({
        reference: qrPayment.reference,
        amount: qrPayment.amount,
        rate: qrPayment.rate,
        hours: qrPayment.hours,
        method: qrPayment.method,
        coachName: qrPayment.coachName,
        memberName: 'You',
        sessionDate: qrPayment.sessionDate,
        notes: '',
        date: new Date(),
      });
      setQrPayment(null);
      onPaid?.();
    } catch (e) {
      showToast(e.response?.data?.error || 'Confirm failed', 'error');
    }
  };

  if (receipt) {
    return <CoachPaymentReceipt data={receipt} perspective="member" onClose={() => { setReceipt(null); onClose(); }} />;
  }

  if (qrPayment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setQrPayment(null); onClose(); }}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-center">Payment Pending</h2>
          <p className="text-xs text-gray-500 text-center mb-4">
            Scan this QR with your phone to keep the payment details.
            We've also emailed you a copy.
          </p>
          <img src={qrPayment.qr} alt="QR" className="mx-auto w-56 h-56 rounded-lg border border-gray-200 dark:border-gray-700" />
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Reference" value={<span className="font-mono">{qrPayment.reference}</span>} />
            <Row label="Amount" value={`₱${Number(qrPayment.amount).toFixed(2)}`} />
            <Row label="Method" value={String(qrPayment.method).toUpperCase()} />
          </div>
          <button onClick={confirmQr} className="w-full mt-5 bg-brand-600 text-white py-2.5 rounded-lg hover:bg-brand-700">
            I've sent the payment
          </button>
          <button onClick={() => { setQrPayment(null); onClose(); }} className="w-full mt-2 text-xs text-gray-500 hover:underline">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onSubmit={submit}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-1">Pay Coach</h2>
        <p className="text-xs text-gray-500 mb-4">
          Coach: <b>{coach?.full_name}</b> · ₱{Number(rate).toFixed(2)}/hr
        </p>

        {!rate && (
          <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900 rounded p-3 mb-4 text-sm text-yellow-800 dark:text-yellow-200">
            This coach hasn't set their hourly rate yet.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Hours trained</label>
            <input type="number" step="0.5" min="0.5" value={hours}
              onChange={e => setHours(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Session date</label>
            <input type="date" value={sessionDate}
              onChange={e => setSessionDate(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Payment method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. 3rd session — squat form"
              className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
        </div>

        <div className="my-4 border-t border-dashed border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Rate</span>
            <span>₱{Number(rate).toFixed(2)} × {hoursNum || 0} hr</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-1">
            <span>Total</span>
            <span className="text-green-600">₱{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button disabled={busy || !rate}
            className="flex-1 bg-brand-600 text-white py-2 rounded hover:bg-brand-700 disabled:opacity-40">
            {busy ? 'Processing…' : 'Confirm payment'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700">
            Cancel
          </button>
        </div>
      </form>
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
