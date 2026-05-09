import { useState } from 'react';
import { api } from '../services/api';
import { Icon } from '../components/UI/Icon';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function Register({ onLogin, onBack }) {
  const [step, setStep] = useState(1);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [orgName, setOrgName]     = useState('');
  const [orgSlug, setOrgSlug]     = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleOrgName = (v) => {
    setOrgName(v);
    if (!slugEdited) setOrgSlug(slugify(v));
  };

  const next = (e) => {
    e.preventDefault();
    setError('');
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setError('All fields are required.'); return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.'); return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.'); return;
      }
      setStep(2);
    } else {
      submit();
    }
  };

  const submit = async () => {
    if (!orgName.trim()) { setError('Organization name is required.'); return; }
    if (!orgSlug.trim()) { setError('Organization slug is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.register({ email, password, firstName, lastName, organizationName: orgName, organizationSlug: orgSlug });
      localStorage.setItem('accessToken', data.accessToken);
      onLogin(data.user);
    } catch (e) {
      setError(e.message || 'Registration failed. Please try again.');
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
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Create your workspace</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
            {step === 1 ? 'Start with your account details' : 'Name your organization'}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, padding: '0 2px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? 'var(--accent)' : 'var(--line)', transition: 'background 200ms' }} />
          ))}
        </div>

        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 12, padding: '28px 28px 24px', boxShadow: 'var(--shadow-pop)' }}>
          <form onSubmit={next} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {step === 1 && <>
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
                <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Work email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" style={inp} onFocus={focus} onBlur={blur} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" style={inp} onFocus={focus} onBlur={blur} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Confirm password</span>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" autoComplete="new-password" style={inp} onFocus={focus} onBlur={blur} />
              </label>
            </>}

            {step === 2 && <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>Organization name</span>
                <input autoFocus value={orgName} onChange={e => handleOrgName(e.target.value)} placeholder="Acme Corp" style={inp} onFocus={focus} onBlur={blur} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--ink-2)' }}>
                  Workspace URL
                  <span style={{ fontWeight: 400, color: 'var(--ink-4)', marginLeft: 6 }}>· lowercase, hyphens only</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden', background: 'var(--bg)', transition: 'border-color 120ms' }}
                     onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                     onBlur={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                  <span style={{ padding: '0 10px', color: 'var(--ink-4)', fontSize: 13, borderRight: '1px solid var(--line)', height: 36, display: 'flex', alignItems: 'center', background: 'var(--bg-sunken)', whiteSpace: 'nowrap' }}>crm/</span>
                  <input
                    value={orgSlug}
                    onChange={e => { setOrgSlug(slugify(e.target.value)); setSlugEdited(true); }}
                    placeholder="acme-corp"
                    style={{ ...inp, border: 'none', borderRadius: 0, paddingLeft: 10, flex: 1 }}
                  />
                </div>
              </label>

              <div style={{ padding: '10px 12px', background: 'var(--accent-soft)', borderRadius: 7, fontSize: 12, color: 'var(--accent-ink)', lineHeight: 1.5 }}>
                You'll be the <strong>admin</strong> of this workspace. You can invite teammates after setup.
              </div>
            </>}

            {error && (
              <div style={{ padding: '9px 12px', background: 'oklch(0.97 0.02 12)', border: '1px solid oklch(0.9 0.05 12)', borderRadius: 6, fontSize: 12.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="flag" size={12} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {step === 2 && (
                <button type="button" className="btn sm" style={{ height: 36, fontSize: 13 }} onClick={() => { setStep(1); setError(''); }}>
                  Back
                </button>
              )}
              <button type="submit" disabled={loading} className="btn primary" style={{ flex: 1, height: 36, fontSize: 13.5, opacity: loading ? 0.72 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Creating workspace…' : step === 1 ? 'Continue →' : 'Create workspace'}
              </button>
            </div>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--ink-4)' }}>
          Already have a workspace?{' '}
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-ink)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'var(--font)' }}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
