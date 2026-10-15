export default function CoachPaymentReceipt({ data, perspective = 'member', onClose }) {
  if (!data) return null;
  const {
    reference, amount, rate, hours, method,
    coachName, memberName, sessionDate, notes, date,
  } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-2">
          <div className="text-4xl">🧾</div>
          <h2 className="text-2xl font-bold mt-2">Coach Payment</h2>
          <p className="text-xs text-gray-500 tracking-widest uppercase mt-1">FitForge</p>
        </div>

        <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-5" />

        <div className="space-y-2 text-sm">
          <Row label="Reference" value={<span className="font-mono">{reference}</span>} />
          <Row label="Date" value={new Date(date).toLocaleString()} />
          <Row
            label={perspective === 'member' ? 'Paid to' : 'Paid by'}
            value={perspective === 'member' ? coachName : memberName}
          />
          {sessionDate && <Row label="Session date" value={sessionDate} />}
          <Row label="Rate" value={`₱${Number(rate).toFixed(2)}/hr`} />
          <Row label="Hours" value={hours} />
          <Row label="Method" value={String(method || '').toUpperCase()} />
          {notes && <Row label="Notes" value={notes} />}
        </div>

        <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-5" />

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {perspective === 'member' ? 'Total paid' : 'Total received'}
          </span>
          <span className="text-2xl font-bold text-green-600">
            ₱{Number(amount).toFixed(2)}
          </span>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Thank you for using FitForge!
        </p>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-brand-600 text-white py-2.5 rounded-lg hover:bg-brand-700 font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
