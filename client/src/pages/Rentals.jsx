import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import Receipt from '../components/Receipt';
import QRModal from '../components/QRModal';

const METHODS = [
  { value: 'cash',  label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya',  label: 'Maya / PayMaya' },
  { value: 'bank',  label: 'Bank transfer' },
  { value: 'card',  label: 'Credit / Debit card' },
];

const METHOD_LABEL = (v) => METHODS.find(m => m.value === v)?.label || v;

export default function Rentals() {
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState([]);
  const [method, setMethod] = useState('gcash');
  const [busy, setBusy] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const { showToast } = useToast();

  const load = () => {
    api.get('/rentals/items').then(r => setItems(r.data));
    api.get('/rentals/me').then(r => setMine(r.data));
  };
  useEffect(load, []);

  const rent = async (item) => {
    setBusy(item.id);
    try {
      const start = new Date();
      const end   = new Date(Date.now() + 2 * 3_600_000);

      const { data: rental } = await api.post('/rentals', {
        item_id: item.id, quantity: 1, start_time: start, end_time: end,
      });

      const methodDetails =
        method === 'gcash' ? { mobile: '0917XXXXXXX' }
        : method === 'maya' ? { mobile: '0917XXXXXXX' }
        : method === 'bank' ? { bank: 'BDO', account: '****1234' }
        : method === 'cash' ? { cashier: 'front-desk' }
        : method === 'card' ? { last4: '4242' }
        : {};

      const { data: payment } = await api.post('/payments', {
        amount: rental.total_cost,
        method,
        purpose: 'rental',
        referenceId: rental.id,
        details: {
          items: [
            { label: 'Item',     value: item.name },
            { label: 'Quantity', value: 1 },
            { label: 'Duration', value: `${rental.hours} hour${rental.hours > 1 ? 's' : ''}` },
            { label: 'Rate',     value: `₱${Number(item.hourly_rate).toFixed(2)}/hr` },
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
        showToast(`Rented ${item.name} for ${rental.hours} hour(s)`);
        setReceipt({
          title: 'Equipment Rental',
          amount: rental.total_cost,
          method,
          reference: payment.reference,
          date: new Date(),
          items: [
            { label: 'Item',     value: item.name },
            { label: 'Quantity', value: 1 },
            { label: 'Duration', value: `${rental.hours} hour${rental.hours > 1 ? 's' : ''}` },
            { label: 'Rate',     value: `₱${Number(item.hourly_rate).toFixed(2)}/hr` },
            { label: 'Payment',  value: METHOD_LABEL(method) },
          ],
        });
      }
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Rental failed', 'error');
    } finally { setBusy(null); }
  };

  const returnItem = async (id) => {
    try {
      await api.post(`/rentals/${id}/return`);
      showToast('Item returned successfully.');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Return failed', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Rent Equipment</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Payment method:</label>
        <select value={method} onChange={e => setMethod(e.target.value)}
          className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700">
          {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {items.map(i => (
          <div key={i.id}
            className="p-5 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 space-y-2">
            <h3 className="font-semibold">{i.name}</h3>
            <p className="text-xs text-gray-500">{i.category} · stock {i.stock}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{i.description}</p>
            <p className="font-bold">₱{Number(i.hourly_rate).toFixed(2)}/hr</p>
            <button
              disabled={i.stock < 1 || busy === i.id}
              onClick={() => rent(i)}
              className="w-full bg-green-600 disabled:bg-gray-400 text-white py-1.5 rounded hover:bg-green-700"
            >
              {busy === i.id
                ? 'Processing…'
                : i.stock < 1
                  ? 'Out of stock'
                  : `Rent 2 hrs · ₱${(Number(i.hourly_rate) * 2).toFixed(2)}`}
            </button>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3">My rentals</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {mine.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No rentals yet.</p>
          )}
          {mine.map(r => (
            <div key={r.id} className="p-4 flex justify-between items-center text-sm">
              <span><b>{r.item_name}</b> × {r.quantity} — {r.status} — ₱{r.total_cost}</span>
              {r.status !== 'returned' && r.status !== 'cancelled' && (
                <button
                  onClick={() => returnItem(r.id)}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Return
                </button>
              )}
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