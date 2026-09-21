export default function Card({ label, value, children }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800">
      {label && <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>}
      {value !== undefined && <p className="text-3xl font-bold">{value}</p>}
      {children}
    </div>
  );
}