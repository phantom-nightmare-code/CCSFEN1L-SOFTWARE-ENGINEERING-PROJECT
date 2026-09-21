import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext();
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4500) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto cursor-pointer px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-sm flex items-start gap-2 ${
              t.type === 'error'
                ? 'bg-red-600'
                : t.type === 'info'
                  ? 'bg-blue-600'
                  : 'bg-green-600'
            }`}
          >
            <span>
              {t.type === 'error' ? '❌' : t.type === 'info' ? 'ℹ️' : '✅'}
            </span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}