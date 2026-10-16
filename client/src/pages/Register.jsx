import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    email: '', password: '', username: '', full_name: '', birthday: '',
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const minBirthday = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d.toISOString().slice(0, 10);
  })();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ NEW: Validate email domain on submit
  const isAllowedEmail = (email) => {
    const domain = email.toLowerCase().split('@')[1];
    return ['gmail.com', 'yahoo.com'].includes(domain);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    // ✅ Frontend check before hitting the backend
    if (!isAllowedEmail(form.email)) {
      const msg = 'Only Gmail (@gmail.com) and Yahoo (@yahoo.com) email addresses are allowed.';
      setErr(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await register(form);
      if (data.requiresVerification) {
        setSubmitted(true);
        showToast('Account created — check your email', 'success');
      } else {
        showToast('Account created!');
      }
    } catch (ex) {
      const msg = ex.response?.data?.error || 'Registration failed';
      setErr(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: form.email });
      setResent(true);
      showToast('Verification email sent');
    } catch (e) {
      showToast(e.response?.data?.error || 'Resend failed', 'error');
    } finally {
      setResending(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow w-full max-w-sm space-y-4 border border-gray-100 dark:border-gray-800 text-center">
          <div className="text-5xl">📬</div>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-sm text-gray-500">We sent a verification link to:</p>
          <p className="font-medium break-all">{form.email}</p>
          <p className="text-xs text-gray-500">
            Click the link in the email to activate your account. The link expires in 24 hours.
          </p>
          <p className="text-xs text-gray-400">Don't see it? Check your Spam folder.</p>

          {!resent ? (
            <button
              onClick={resend}
              disabled={resending}
              className="w-full bg-brand-600 text-white py-2 rounded hover:bg-brand-700 disabled:opacity-40"
            >
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          ) : (
            <p className="text-xs text-green-600">✅ Email resent</p>
          )}

          <Link to="/login" className="block text-sm text-brand-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

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

        <input name="email" type="email" required placeholder="Email (Gmail or Yahoo only)"
          value={form.email} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />
        
        {/* ✅ NEW: Helpful hint for users */}
        <p className="text-xs text-gray-400 -mt-2 mb-2">
          Must be a @gmail.com or @yahoo.com address.
        </p>

        <input name="username" placeholder="Username (optional)"
          value={form.username} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />
        <input name="full_name" placeholder="Full name (optional)"
          value={form.full_name} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />

        <div>
          <label className="text-xs text-gray-500 block mb-1">Birthday (optional)</label>
          <input name="birthday" type="date" min={minBirthday} max={today}
            value={form.birthday} onChange={onChange}
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />
          <p className="text-xs text-gray-400 mt-1">Must be at least 13 years old.</p>
        </div>

        <input name="password" type="password" required minLength={6}
          placeholder="Password (min 6 chars)"
          value={form.password} onChange={onChange}
          className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />

        <p className="text-xs text-gray-500">
          We'll send a verification email to confirm your account.
        </p>

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
