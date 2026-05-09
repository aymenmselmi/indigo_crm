import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { Avatar, Chip } from '../components/UI/Primitives';
import { api } from '../services/api';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusChip({ status }) {
  if (status === 'accepted') return <Chip tone="success" dot>Accepted</Chip>;
  if (status === 'pending')  return <Chip tone="warn" dot>Pending</Chip>;
  if (status === 'revoked')  return <Chip dot>Revoked</Chip>;
  if (status === 'expired')  return <Chip dot>Expired</Chip>;
  return <Chip>{status}</Chip>;
}

export const MembersView = ({ addToast, user }) => {
  const [members, setMembers]         = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loadingM, setLoadingM]       = useState(true);
  const [loadingI, setLoadingI]       = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('user');
  const [inviting, setInviting]       = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteLink, setInviteLink]   = useState('');
  const [copied, setCopied]           = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadMembers = () => {
    setLoadingM(true);
    api.listMembers()
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingM(false));
  };

  const loadInvitations = () => {
    setLoadingI(true);
    api.listInvitations()
      .then(data => setInvitations(Array.isArray(data) ? data : []))
      .catch(() => setInvitations([]))
      .finally(() => setLoadingI(false));
  };

  useEffect(() => {
    loadMembers();
    if (isAdmin) loadInvitations();
    else setLoadingI(false);
  }, [isAdmin]);

  const sendInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteLink('');
    if (!inviteEmail.trim()) { setInviteError('Email is required.'); return; }
    setInviting(true);
    try {
      const res = await api.invite(inviteEmail.trim(), inviteRole);
      setInviteLink(res.inviteUrl);
      setInviteEmail('');
      addToast && addToast(`Invitation created for ${res.email}`);
      loadInvitations();
    } catch (e) {
      setInviteError(e.message || 'Failed to create invitation.');
    } finally {
      setInviting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const revoke = async (id, email) => {
    try {
      await api.revokeInvitation(id);
      addToast && addToast(`Invitation revoked for ${email}`);
      loadInvitations();
    } catch (e) {
      addToast && addToast(`Error: ${e.message}`);
    }
  };

  const pendingInvites = invitations.filter(i => i.status === 'pending');
  const pastInvites    = invitations.filter(i => i.status !== 'pending');

  const inp = {
    height: 32, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 7,
    background: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 12.5,
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 120ms',
  };

  return (
    <div className="page-inner" style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Members</div>
          <div className="page-sub">
            <span className="mono">{members.length}</span> member{members.length !== 1 ? 's' : ''}
            {pendingInvites.length > 0 && <> · <span style={{ color: 'var(--warn)' }}>{pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}</span></>}
          </div>
        </div>
      </div>

      {/* Invite form — admin only */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head">
            <div className="card-title">Invite teammate</div>
            <span className="card-sub">Invite link is valid for 7 days</span>
          </div>
          <div className="card-body">
            <form onSubmit={sendInvite} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                style={{ ...inp, flex: '1 1 220px', minWidth: 0 }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--line)')}
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                style={{ ...inp, width: 100 }}
              >
                <option value="user">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" disabled={inviting} className="btn primary sm" style={{ height: 32, flexShrink: 0 }}>
                <Icon name="plus" size={12} />
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </form>

            {inviteError && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="flag" size={11} />{inviteError}
              </div>
            )}

            {inviteLink && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--accent-soft)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="link" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                  {inviteLink}
                </span>
                <button className="btn sm" onClick={copyLink} style={{ flexShrink: 0, minWidth: 64 }}>
                  {copied ? '✓ Copied' : 'Copy link'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div className="card-title">Team members</div>
          <span className="card-sub">{members.length} total</span>
        </div>
        <div className="card-body flush">
          {loadingM ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
          ) : members.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>No members found</div>
          ) : members.map((m, i) => {
            const displayName = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
            const initials = (displayName[0] + (displayName.split(' ')[1]?.[0] || '')).toUpperCase();
            const isMe = m.id === user?.id;
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <Avatar id={initials} size="md" name={displayName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 550, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {displayName}
                    {isMe && <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 400 }}>· you</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{m.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.role === 'admin'
                    ? <Chip tone="accent">Admin</Chip>
                    : <Chip>Member</Chip>}
                  <span className="mono muted" style={{ fontSize: 11 }}>
                    {m.lastLogin ? `Active ${fmtDate(m.lastLogin)}` : `Joined ${fmtDate(m.createdAt)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invitations — admin only */}
      {isAdmin && pendingInvites.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head">
            <div className="card-title">Pending invitations</div>
            <span className="card-sub">{pendingInvites.length}</span>
          </div>
          <div className="card-body flush">
            {loadingI ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : pendingInvites.map((inv, i) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < pendingInvites.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="mail" size={13} style={{ color: 'var(--ink-4)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 1 }}>Expires {fmtDate(inv.expiresAt)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {inv.role === 'admin' ? <Chip tone="accent">Admin</Chip> : <Chip>Member</Chip>}
                  <StatusChip status={inv.status} />
                  <button className="btn ghost sm" style={{ color: 'var(--danger)' }} onClick={() => revoke(inv.id, inv.email)}>
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past invitations */}
      {isAdmin && pastInvites.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Past invitations</div>
            <span className="card-sub">{pastInvites.length}</span>
          </div>
          <div className="card-body flush">
            {pastInvites.map((inv, i) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < pastInvites.length - 1 ? '1px solid var(--line)' : 'none', opacity: 0.65 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="mail" size={13} style={{ color: 'var(--ink-4)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 1 }}>{fmtDate(inv.createdAt)}</div>
                </div>
                <StatusChip status={inv.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
