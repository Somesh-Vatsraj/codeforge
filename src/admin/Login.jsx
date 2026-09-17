import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../store.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Login() {
  const { admin, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [needsSetup, setNeedsSetup] = useState(null); // null = unknown
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Proper probe — dedicated GET endpoint, no side effects
  useEffect(() => {
    let cancelled = false;
    api.get('/admin/setup-status')
      .then((data) => { if (!cancelled) setNeedsSetup(!!data.needsSetup); })
      .catch(() => { if (!cancelled) setNeedsSetup(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || needsSetup === null) {
    return <div className="admin-boot"><Spinner label="Loading…" /></div>;
  }

  if (admin) {
    return <Navigate to={location.state?.from || '/admin/dashboard'} replace />;
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from || '/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (form.password.length < 10) { setError('Password must be at least 10 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }

    setSubmitting(true);
    try {
      await api.post('/admin/setup', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setNotice('Admin account created. Signing you in…');
      await login(form.username.trim(), form.password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Setup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1>{needsSetup ? 'Create admin account' : 'Admin sign in'}</h1>
        <p className="muted small">
          {needsSetup
            ? 'This is a one-time setup. It is permanently disabled once the account exists.'
            : 'Single-administrator access. There is no public registration.'}
        </p>

        {error && <p className="alert alert--error" role="alert">{error}</p>}
        {notice && <p className="alert alert--success">{notice}</p>}

        {needsSetup ? (
          <form onSubmit={handleSetup} className="form">
            <label>
              Username
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required minLength={3} autoComplete="username"
              />
            </label>
            <label>
              Email <span className="muted small">(optional)</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required minLength={10} autoComplete="new-password"
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required minLength={10} autoComplete="new-password"
              />
            </label>
            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create admin account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="form">
            <label>
              Username or email
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required autoComplete="username" autoFocus
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password"
              />
            </label>
            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
