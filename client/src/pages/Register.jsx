import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', username: '', full_name: '', birthday: '',
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const user = await register(form);
      showToast(`Account created — welcome, ${user.full_name || user.email}!`);
      setTimeout(() => nav('/'), 400);
    } catch (ex) {
      const msg = ex.response?.data?.error || 'Registration failed';
      setErr(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
      <form onSubmit={onSubmit}
        className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow w-full max-w-sm space-y-4 border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold">Create account</h1>

        {err && (
          <p className="text-red-500 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded px-3 py-2">
            {err}
          </p>
        )}

        <input name="email" type="email" required placeholder="Email"
          value={form.email} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />
        <input name="username" placeholder="Username (optional)"
          value={form.username} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />
        <input name="full_name" placeholder="Full name (optional)"
          value={form.full_name} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />

        <div>
          <label className="text-xs text-gray-500 block mb-1">Birthday (optional)</label>
          <input name="birthday" type="date"
            value={form.birthday} onChange={onChange}
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />
        </div>

        <input name="password" type="password" required minLength={6}
          placeholder="Password (min 6 chars)"
          value={form.password} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />

        <button
          disabled={loading}
          className="w-full bg-brand-600 text-white py-2 rounded hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Register'}
        </button>

        <p className="text-sm text-center">
          Have an account? <Link to="/login" className="text-brand-600">Login</Link>
        </p>
      </form>
    </div>
  );
}