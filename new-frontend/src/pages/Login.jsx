import { useState } from 'react';
import { api } from '../services/api';
import { Icon } from '../components/UI/Icon';

export default function Login({ onLogin, onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('accessToken', data.accessToken);
      onLogin(data.user);
    } catch {
      setError('Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    height: 36,
    padding: '0 12px',
    border: '1px solid var(--line)',
    borderRadius: 7,
    background: 'var(--bg)',
    fontFamily: 'var(--font)',
    fontSize: 13.5,
    color: 'var(--ink)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 120ms',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-sunken)',
      fontFamily: 'var(--font)',
    }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--accent)',
            display: 'inline-grid',
            placeItems: 'center',
            marginBottom: 14,
          }}>
            <Icon name="pipeline" size={22} style={{ color: 'white' }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Indigo CRM
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
            Sign in to your workspace
          </div>
        </div>

        <div style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: '28px 28px 24px',
          boxShadow: 'var(--shadow-pop)',
        }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoFocus
                autoComplete="email"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--line)')}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Password</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--line)')}
              />
            </label>

            {error && (
              <div style={{
                padding: '9px 12px',
                background: 'oklch(0.97 0.02 12)',
                border: '1px solid oklch(0.9 0.05 12)',
                borderRadius: 6,
                fontSize: 12.5,
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Icon name="flag" size={12} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn primary"
              style={{ height: 36, fontSize: 13.5, marginTop: 2, opacity: loading ? 0.72 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--ink-4)' }}>
          No account?{' '}
          <button
            onClick={onRegister}
            style={{ background: 'none', border: 'none', color: 'var(--accent-ink)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'var(--font)' }}
          >
            Create a workspace
          </button>
        </div>
      </div>
    </div>
  );
}
