import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { Chip } from '../components/UI/Primitives';
import { api } from '../services/api';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CHIP = {
  active:    <Chip tone="success" dot>Active</Chip>,
  inactive:  <Chip dot>Inactive</Chip>,
  suspended: <Chip tone="danger" dot>Suspended</Chip>,
};

const PLAN_CHIP = {
  free:         <Chip>Free</Chip>,
  starter:      <Chip tone="accent">Starter</Chip>,
  professional: <Chip tone="accent">Pro</Chip>,
  enterprise:   <Chip tone="success">Enterprise</Chip>,
};

function StatCard({ icon, label, value, sub, tone }) {
  return (
    <div className="kpi">
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Icon name={icon} size={14} style={{ color: tone === 'danger' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--accent)' }} />
        <div className="kpi-label">{label}</div>
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-foot"><span className="kpi-delta flat">{sub}</span></div>}
    </div>
  );
}

function OrgRow({ org, onStatusChange, addToast }) {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = org.status === 'active' ? 'suspended' : 'active';
    setLoading(true);
    try {
      await api.adminUpdateOrg(org.id, { status: next });
      addToast && addToast(`${org.name} ${next}`);
      onStatusChange();
    } catch (e) {
      addToast && addToast(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr>
      <td>
        <div className="cell-stack">
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: `oklch(0.6 0.14 ${org.name.charCodeAt(0) * 7 % 360})`,
            fontSize: 11, fontWeight: 700, color: 'white',
          }}>
            {org.name[0].toUpperCase()}
          </div>
          <div>
            <div className="cell-name">{org.name}</div>
            <div className="cell-sub mono">{org.slug}</div>
          </div>
        </div>
      </td>
      <td>{STATUS_CHIP[org.status] || <Chip>{org.status}</Chip>}</td>
      <td>{PLAN_CHIP[org.planType] || <Chip>{org.planType}</Chip>}</td>
      <td className="num">
        <span className="mono">{org.userCount}</span>
        <span className="muted" style={{ fontSize: 10.5 }}>/{org.maxUsers}</span>
      </td>
      <td className="mono muted" style={{ fontSize: 11 }}>{org.dbName || '—'}</td>
      <td className="mono muted" style={{ fontSize: 11 }}>{fmtDate(org.createdAt)}</td>
      <td>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button
            className={`btn sm ${org.status === 'active' ? 'ghost' : 'primary'}`}
            style={{ fontSize: 11, color: org.status === 'active' ? 'var(--danger)' : undefined }}
            onClick={toggle} disabled={loading}
          >
            {loading ? '…' : org.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function UserRow({ user, onUpdate, addToast }) {
  const [loading, setLoading] = useState(false);

  const toggleStatus = async () => {
    const next = user.status === 'active' ? 'suspended' : 'active';
    setLoading(true);
    try {
      await api.adminUpdateUser(user.id, { status: next });
      addToast && addToast(`User ${user.email} ${next}`);
      onUpdate();
    } catch (e) {
      addToast && addToast(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr>
      <td>
        <div className="cell-stack">
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
            background: `oklch(0.6 0.14 ${user.email.charCodeAt(0) * 7 % 360})`,
            fontSize: 11, fontWeight: 600, color: 'white',
          }}>
            {(user.firstName?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div>
            <div className="cell-name">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}</div>
            <div className="cell-sub mono">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="muted">{user.organizationName}</td>
      <td>
        {user.role === 'super_admin'
          ? <Chip tone="danger">Super admin</Chip>
          : user.role === 'admin'
          ? <Chip tone="accent">Admin</Chip>
          : <Chip>Member</Chip>}
      </td>
      <td>{STATUS_CHIP[user.status] || <Chip>{user.status}</Chip>}</td>
      <td className="mono muted" style={{ fontSize: 11 }}>{user.lastLogin ? fmtDate(user.lastLogin) : 'Never'}</td>
      <td className="mono muted" style={{ fontSize: 11 }}>{fmtDate(user.createdAt)}</td>
      <td>
        {user.role !== 'super_admin' && (
          <button
            className="btn ghost sm"
            style={{ fontSize: 11, color: user.status === 'active' ? 'var(--danger)' : undefined }}
            onClick={toggleStatus} disabled={loading}
          >
            {loading ? '…' : user.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        )}
      </td>
    </tr>
  );
}

export const BackOfficeView = ({ addToast }) => {
  const [tab, setTab]         = useState('orgs');
  const [stats, setStats]     = useState(null);
  const [orgs, setOrgs]       = useState([]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const loadStats = () => api.adminStats().then(setStats).catch(() => {});
  const loadOrgs  = () => api.adminListOrgs().then(setOrgs).catch(() => setOrgs([]));
  const loadUsers = (q) => api.adminListUsers(q).then(setUsers).catch(() => setUsers([]));

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([loadStats(), loadOrgs(), loadUsers('')])
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    loadUsers(e.target.value);
  };

  const reload = () => {
    loadStats();
    if (tab === 'orgs')  loadOrgs();
    if (tab === 'users') loadUsers(search);
  };

  const TABS = [
    { id: 'orgs',  label: 'Organizations', icon: 'company' },
    { id: 'users', label: 'All users',     icon: 'users'   },
  ];

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Back office</div>
          <div className="page-sub">Platform administration · super admin only</div>
        </div>
        <div className="actions">
          <button className="btn sm" onClick={reload}><Icon name="sparkle" size={13} />Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <StatCard icon="company"    label="Organizations"  value={stats ? stats.totalOrgs      : '…'} sub={`${stats?.activeOrgs ?? '…'} active`}    tone="accent"   />
        <StatCard icon="users"      label="Total users"    value={stats ? stats.totalUsers     : '…'} sub="across all orgs"                           tone="accent"   />
        <StatCard icon="check"      label="Active orgs"    value={stats ? stats.activeOrgs     : '…'} sub="running tenants"                           tone="success"  />
        <StatCard icon="flag"       label="Suspended"      value={stats ? stats.suspendedOrgs  : '…'} sub="suspended orgs"                            tone="danger"   />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="btn ghost sm"
            style={{
              borderRadius: '6px 6px 0 0', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--accent-ink)' : 'var(--ink-3)', fontWeight: tab === t.id ? 600 : 400,
            }}>
            <Icon name={t.icon} size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* Organizations tab */}
      {tab === 'orgs' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Organizations</div>
            <span className="card-sub">{orgs.length} tenants</span>
          </div>
          <div className="card-body flush">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th className="num">Users</th>
                    <th>Database</th>
                    <th>Created</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map(org => (
                    <OrgRow key={org.id} org={org} onStatusChange={reload} addToast={addToast} />
                  ))}
                  {orgs.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-4)', fontSize: 12 }}>No organizations found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">All users</div>
            <span className="card-sub">{users.length} total</span>
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <Icon name="search" size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
              <input
                value={search} onChange={handleSearch}
                placeholder="Search users"
                style={{ height: 24, padding: '0 8px 0 26px', border: '1px solid var(--line)', borderRadius: 5, background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 11.5, outline: 'none', width: 200, color: 'var(--ink)' }}
              />
            </div>
          </div>
          <div className="card-body flush">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Organization</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th>Joined</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <UserRow key={u.id} user={u} onUpdate={reload} addToast={addToast} />
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-4)', fontSize: 12 }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
