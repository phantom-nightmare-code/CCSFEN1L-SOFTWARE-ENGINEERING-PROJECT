import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setNeedsVerification(false);
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      showToast(`Welcome back, ${user.full_name || user.email}!`);
      setTimeout(() => nav('/'), 400);
    } catch (ex) {
      const data = ex.response?.data;
      const msg = data?.error || 'Login failed';
      setErr(msg);
      if (data?.requiresVerification) {
        setNeedsVerification(true);
        setForm(f => ({ ...f, email: data.email || f.email }));
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: form.email });
      setResent(true);
      showToast('Verification email sent — check your inbox');
    } catch (e) {
      showToast(e.response?.data?.error || 'Resend failed', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
      <form onSubmit={onSubmit}
        className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow w-full max-w-sm space-y-4 border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold">Login</h1>

        {err && !needsVerification && (
          <p className="text-red-500 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded px-3 py-2">
            {err}
          </p>
        )}

        {needsVerification && (
          <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900 rounded px-3 py-3 text-sm space-y-2">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              📬 Verify your email first
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs">
              We sent a verification link to <b>{form.email}</b>. Click it to activate your account.
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs">
              Check your Spam folder if you don't see it.
            </p>
            {!resent ? (
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-40 text-white text-xs py-1.5 rounded"
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
            ) : (
              <p className="text-xs text-green-700 dark:text-green-300">
                ✅ Verification email sent
              </p>
            )}
          </div>
        )}

        <input
          name="email" type="email" required placeholder="Email"
          value={form.email} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
        />
        <input
          name="password" type="password" required placeholder="Password"
          value={form.password} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
        />

        <button
          disabled={loading}
          className="w-full bg-brand-600 text-white py-2 rounded hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-center">
          No account? <Link to="/register" className="text-brand-600">Register</Link>
        </p>
      </form>
    </div>
  );
}
