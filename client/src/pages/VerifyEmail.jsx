import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setError('Missing verification token');
      return;
    }

    api.get(`/auth/verify-email/${token}`)
      .then(r => {
        setEmail(r.data.email || '');
        setStatus('success');
      })
      .catch(e => {
        const msg = e.response?.data?.error || 'Verification failed';
        setError(msg);
        if (e.response?.status === 410) setStatus('expired');
        else setStatus('invalid');
      });
  }, [token]);

  const resend = async () => {
    if (!resendEmail.trim()) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: resendEmail.trim() });
      setResent(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg max-w-md w-full p-8 border border-gray-100 dark:border-gray-800">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <div className="text-5xl animate-pulse">⏳</div>
            <h1 className="text-xl font-bold">Verifying your email…</h1>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold text-green-600">Email verified!</h1>
            {email && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">{email}</span> is now confirmed.
              </p>
            )}
            <p className="text-sm text-gray-500">You can now log in and start using FitForge.</p>
            <Link
              to="/login"
              className="inline-block w-full bg-brand-600 text-white py-2.5 rounded-lg hover:bg-brand-700 font-medium"
            >
              Log in to your account
            </Link>
          </div>
        )}

        {(status === 'expired' || status === 'invalid') && (
          <div className="text-center space-y-4">
            <div className="text-5xl">{status === 'expired' ? '⏰' : '❌'}</div>
            <h1 className="text-2xl font-bold text-red-600">
              {status === 'expired' ? 'Link expired' : 'Invalid link'}
            </h1>
            <p className="text-sm text-gray-500">{error}</p>

            {!resent ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">
                  Enter your email to receive a fresh verification link:
                </p>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <button
                  onClick={resend}
                  disabled={resending || !resendEmail.trim()}
                  className="w-full bg-brand-600 text-white py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-40"
                >
                  {resending ? 'Sending…' : 'Send new link'}
                </button>
              </>
            ) : (
              <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded px-3 py-2">
                ✅ If that email is registered, a new link has been sent. Check your inbox.
              </p>
            )}

            <Link to="/login" className="block text-sm text-brand-600 hover:underline pt-2">
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
