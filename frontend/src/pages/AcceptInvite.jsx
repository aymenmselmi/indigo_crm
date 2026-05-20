import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Icon } from '../components/UI/Icon';

export default function AcceptInvite({ token, onLogin }) {
  const [info, setInfo]           = useState(null);
  const [checkError, setCheckError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [checking, setChecking]   = useState(true);

  useEffect(() => {
    if (!token) { setCheckError('No invitation token found in URL.'); setChecking(false); return; }
    api.checkInvite(token)
      .then(data => { setInfo(data); setChecking(false); })
      .catch(e => { setCheckError(e.message || 'Invalid or expired invitation.'); setChecking(false); });
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim()) { setError('First and last name are required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const data = await api.acceptInvite(token, { firstName, lastName, password });
      localStorage.setItem('accessToken', data.accessToken);
      onLogin(data.user);
    } catch (e) {
      setError(e.message || 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    height: 36, padding: '0 12px',
    border: '1px solid var(--line)', borderRadius: 7,
    background: 'var(--bg)', fontFamily: 'var(--font)',
    fontSize: 13.5, color: 'var(--ink)', outline: 'none',
    width: '100%', boxSizing: 'border-box', transition: 'border-color 120ms',
  };
  const focus = e => (e.target.style.borderColor = 'var(--accent)');
  const blur  = e => (e.target.style.borderColor = 'var(--line)');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-sunken)', fontFamily: 'var(--font)' }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
            <Icon name="pipeline" size={22} style={{ color: 'white' }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            You've been invited
          </div>
          {info && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
              Join <strong style={{ color: 'var(--ink-2)' }}>{info.organizationName}</strong> on Indigo CRM
            </div>
          )}
        </div>

        {checking && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-4)', fontSize: 13 }}>
            Validating invitation…
          </div>
        )}

        {!checking && checkError && (
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 12, padding: '32px 28px', boxShadow: 'var(--shadow-pop)', textAlign: 'center' }}>
            <Icon name="flag" size={20} style={{ color: 'var(--danger)', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Invalid invitation</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{checkError}</div>
          </div>
        )}

        {!checking && info && (
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 12, padding: '28px 28px 24px', boxShadow: 'var(--shadow-pop)' }}>
            {/* Invite summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--accent-soft)', borderRadius: 8, marginBottom: 20, fontSize: 12.5 }}>
              <Icon name="mail" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.email}</div>
                <div style={{ color: 'var(--ink-4)', fontSize: 11, marginTop: 1 }}>
                  Joining as <strong style={{ color: 'var(--accent-ink)', textTransform: 'capitalize' }}>{info.role}</strong>
                </div>
              </div>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>First name</span>
                  <input autoFocus value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" style={inp} onFocus={focus} onBlur={blur} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Last name</span>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" style={inp} onFocus={focus} onBlur={blur} />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Choose a password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" style={inp} onFocus={focus} onBlur={blur} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Confirm password</span>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" autoComplete="new-password" style={inp} onFocus={focus} onBlur={blur} />
              </label>

              {error && (
                <div style={{ padding: '9px 12px', background: 'oklch(0.97 0.02 12)', border: '1px solid oklch(0.9 0.05 12)', borderRadius: 6, fontSize: 12.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="flag" size={12} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn primary" style={{ height: 36, fontSize: 13.5, marginTop: 2, opacity: loading ? 0.72 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Setting up account…' : 'Accept invitation'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
