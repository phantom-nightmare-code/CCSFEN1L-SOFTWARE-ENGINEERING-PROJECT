import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import Receipt from '../components/Receipt';
import QRModal from '../components/QRModal';

const PLANS = [
  { type: 'walk-in', price: 100,   label: 'Walk-in',  sub: '₱100 / day' },
  { type: 'monthly', price: 1200,  label: 'Monthly',  sub: '₱1,200 / month' },
  { type: 'yearly',  price: 12000, label: 'Yearly',   sub: '₱12,000 / year (save 17%)' },
];

const METHODS = [
  { value: 'cash',  label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya',  label: 'Maya / PayMaya' },
  { value: 'bank',  label: 'Bank transfer' },
  { value: 'card',  label: 'Credit / Debit card' },
];

const METHOD_LABEL = (v) => METHODS.find(m => m.value === v)?.label || v;

export default function Membership() {
  const [mine, setMine] = useState([]);
  const [method, setMethod] = useState('gcash');
  const [busy, setBusy] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const { showToast } = useToast();

  const load = () => api.get('/memberships/me').then(r => setMine(r.data));
  useEffect(() => { load(); }, []);

  const buy = async (type) => {
    const plan = PLANS.find(p => p.type === type);
    setBusy(type);
    try {
      const { data: m } = await api.post('/memberships', { type, start_date: new Date() });

      const methodDetails =
        method === 'gcash' ? { mobile: '0917XXXXXXX' }
        : method === 'maya' ? { mobile: '0917XXXXXXX' }
        : method === 'bank' ? { bank: 'BDO', account: '****1234' }
        : method === 'cash' ? { cashier: 'front-desk' }
        : method === 'card' ? { last4: '4242' }
        : {};

      const startDate = m.start_date?.slice(0, 10);
      const endDate   = m.end_date?.slice(0, 10);

      const { data: payment } = await api.post('/payments', {
        amount: plan.price,
        method,
        purpose: 'membership',
        referenceId: m.id,
        details: {
          items: [
            { label: 'Plan',     value: plan.label },
            { label: 'Duration', value: `${startDate} → ${endDate}` },
            { label: 'Payment',  value: METHOD_LABEL(method) },
          ],
          ...methodDetails,
        },
      });

      if (payment.status === 'pending') {
        setPendingPayment({
          _id: payment._id,
          reference: payment.reference,
          amount: payment.amount,
          method: payment.method,
        });
        showToast('Payment pending — QR emailed to you', 'info');
      } else {
        showToast(`${plan.label} membership activated!`);
        setReceipt({
          title: `${plan.label} Membership`,
          amount: plan.price,
          method,
          reference: payment.reference,
          date: new Date(),
          items: [
            { label: 'Plan',    value: plan.label },
            { label: 'Start',   value: startDate },
            { label: 'End',     value: endDate },
            { label: 'Payment', value: METHOD_LABEL(method) },
          ],
        });
      }
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Purchase failed', 'error');
    } finally { setBusy(null); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Membership</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map(p => (
          <div key={p.type}
            className="p-5 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 space-y-3">
            <h3 className="font-semibold text-lg">{p.label}</h3>
            <p className="text-sm text-gray-500">{p.sub}</p>
            <button
              onClick={() => buy(p.type)}
              disabled={busy === p.type}
              className="w-full bg-brand-600 text-white py-2 rounded hover:bg-brand-700 disabled:opacity-60"
            >
              {busy === p.type ? 'Processing…' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Payment method:</label>
        <select value={method} onChange={e => setMethod(e.target.value)}
          className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700">
          {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3">My memberships</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {mine.length === 0 && (
            <p className="p-4 text-gray-500 text-sm">No memberships yet.</p>
          )}
          {mine.map(m => (
            <div key={m.id} className="p-4 flex justify-between text-sm">
              <span><b className="capitalize">{m.type}</b> — {m.status}</span>
              <span className="text-gray-500">
                {m.start_date?.slice(0, 10)} → {m.end_date?.slice(0, 10)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {receipt && <Receipt data={receipt} onClose={() => setReceipt(null)} />}
      {pendingPayment && (
        <QRModal
          payment={pendingPayment}
          onClose={() => setPendingPayment(null)}
          onConfirmed={() => load()}
        />
      )}
    </div>
  );
}