import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { Chip, Avatar } from '../components/UI/Primitives';
import { api, unwrap } from '../services/api';
import { normalizeAccount } from '../utils/normalize';

const inp = {
  height: 32, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 12.5,
  color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', width: '100%',
  transition: 'border-color 120ms',
};
const focus = e => (e.target.style.borderColor = 'var(--accent)');
const blur  = e => (e.target.style.borderColor = 'var(--line)');

const Row = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
);
const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11.5, fontWeight: 550, color: 'var(--ink-2)' }}>{label}</span>
    {children}
  </label>
);

const EMPTY = {
  name: '', type: 'prospect', industry: '', website: '',
  phone: '', email: '', employees: '', annualRevenue: '', description: '',
};

const INDUSTRIES = ['SaaS', 'Finance', 'Healthcare', 'Logistics', 'Biotech', 'Energy', 'Retail', 'Manufacturing', 'Media', 'Other'];

function AccountModal({ account, onSave, onClose }) {
  const editing = !!account;
  const [form, setForm]     = useState(account ? {
    name:          account.name,
    type:          account.type || 'prospect',
    industry:      account.industry === '—' ? '' : (account.industry || ''),
    website:       account.domain ? `https://${account.domain}` : '',
    phone:         '',
    email:         '',
    employees:     '',
    annualRevenue: account.mrr ? String(account.mrr * 12) : '',
    description:   '',
  } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        name:          form.name.trim(),
        type:          form.type,
        industry:      form.industry      || undefined,
        website:       form.website       || undefined,
        phone:         form.phone         || undefined,
        email:         form.email         || undefined,
        description:   form.description   || undefined,
        employees:     form.employees     ? Number(form.employees)     : undefined,
        annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : undefined,
      };
      if (editing) await api.updateAccount(account._id, payload);
      else         await api.createAccount(payload);
      onSave();
    } catch (e) {
      setError(e.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ fontWeight: 600, fontSize: 14 }}>{editing ? 'Edit account' : 'New account'}</div>
          <button className="btn ghost icon sm" onClick={onClose} style={{ marginLeft: 'auto' }}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 'calc(90vh - 60px)' }}>
          <Field label="Account name *">
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Inc." onFocus={focus} onBlur={blur} />
          </Field>
          <Row>
            <Field label="Type">
              <select style={inp} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
                <option value="competitor">Competitor</option>
              </select>
            </Field>
            <Field label="Industry">
              <select style={inp} value={form.industry} onChange={e => set('industry', e.target.value)}>
                <option value="">Select…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Website">
              <input style={inp} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://acme.com" onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Phone">
              <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" onFocus={focus} onBlur={blur} />
            </Field>
          </Row>
          <Row>
            <Field label="Employees">
              <input style={inp} type="number" min="0" value={form.employees} onChange={e => set('employees', e.target.value)} placeholder="100" onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Annual revenue ($)">
              <input style={inp} type="number" min="0" value={form.annualRevenue} onChange={e => set('annualRevenue', e.target.value)} placeholder="1000000" onFocus={focus} onBlur={blur} />
            </Field>
          </Row>
          <Field label="Description">
            <textarea
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Brief description…"
              style={{ ...inp, height: 68, padding: '8px 10px', resize: 'vertical' }}
              onFocus={focus} onBlur={blur}
            />
          </Field>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="flag" size={11} />{error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" className="btn sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary sm" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const AccountsView = ({ openDetail, addToast }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [modal, setModal]       = useState(null);

  const load = () => {
    setLoading(true);
    api.getAccounts(200)
      .then(res => setAccounts(unwrap(res).map(normalizeAccount)))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = () => {
    setModal(null);
    load();
    addToast && addToast('Account saved');
  };

  const handleDelete = async (a, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete account "${a.name}"?`)) return;
    try {
      await api.deleteAccount(a._id);
      addToast && addToast(`"${a.name}" deleted`);
      setSelected(s => { const n = new Set(s); n.delete(a.id); return n; });
      load();
    } catch (err) {
      addToast && addToast(`Error: ${err.message}`);
    }
  };

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const rows = accounts.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all' && a.type !== filter) return false;
    return true;
  });

  return (
    <>
      <div className="filters">
        <button className={`filter-pill ${filter === 'all'      ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All <span className="mono muted">{accounts.length}</span>
        </button>
        <button className={`filter-pill ${filter === 'customer' ? 'active' : ''}`} onClick={() => setFilter('customer')}>
          Customer <span className="mono muted">{accounts.filter(a => a.type === 'customer').length}</span>
        </button>
        <button className={`filter-pill ${filter === 'prospect' ? 'active' : ''}`} onClick={() => setFilter('prospect')}>
          Prospect <span className="mono muted">{accounts.filter(a => a.type === 'prospect').length}</span>
        </button>
        <button className={`filter-pill ${filter === 'partner'  ? 'active' : ''}`} onClick={() => setFilter('partner')}>
          Partner <span className="mono muted">{accounts.filter(a => a.type === 'partner').length}</span>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts"
              style={{ height: 24, padding: '0 8px 0 26px', border: '1px solid var(--line)', borderRadius: 5, background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 11.5, outline: 'none', width: 200, color: 'var(--ink)' }}
            />
          </div>
          <button className="btn accent sm" onClick={() => setModal('create')}>
            <Icon name="plus" size={13} />New account
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ padding: '8px 16px', background: 'var(--accent-soft)', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-ink)' }}>{selected.size} selected</span>
          <button className="btn ghost sm">Export</button>
          <button className="btn ghost sm" style={{ color: 'var(--danger)' }} onClick={async () => {
            if (!window.confirm(`Delete ${selected.size} account(s)?`)) return;
            await Promise.allSettled([...selected].map(id => {
              const a = accounts.find(x => x.id === id);
              return a ? api.deleteAccount(a._id) : Promise.resolve();
            }));
            addToast && addToast(`${selected.size} deleted`);
            setSelected(new Set());
            load();
          }}>Delete</button>
          <button className="btn ghost sm" onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto' }}>Clear</button>
        </div>
      )}

      <div style={{ overflow: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading accounts…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  <input type="checkbox"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={() => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))}
                  />
                </th>
                <th>Account <span className="sort">↕</span></th>
                <th>Industry</th>
                <th>Tier</th>
                <th>Health</th>
                <th className="num">MRR</th>
                <th>Tags</th>
                <th>Owner</th>
                <th className="mono">ID</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => {
                const healthChip =
                  a.health === 'good'      ? <Chip tone="success" dot>Healthy</Chip>
                  : a.health === 'at-risk' ? <Chip tone="warn" dot>At-risk</Chip>
                  :                         <Chip tone="danger" dot>Churn risk</Chip>;
                return (
                  <tr key={a.id} className={selected.has(a.id) ? 'selected' : ''} onClick={() => openDetail({ kind: 'account', data: a })}>
                    <td onClick={e => { e.stopPropagation(); toggle(a.id); }}>
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                    </td>
                    <td>
                      <div className="cell-stack">
                        <div className="avatar sm" style={{ background: 'var(--bg-sunken)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 5 }}>
                          {a.name[0]}
                        </div>
                        <div>
                          <div className="cell-name">{a.name}</div>
                          <div className="cell-sub">{a.domain || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{a.industry}</td>
                    <td>
                      {a.tier === 'Strategic' ? <Chip tone="accent">Strategic</Chip>
                       : a.tier === 'Mid'     ? <Chip>Mid</Chip>
                       :                        <Chip>SMB</Chip>}
                    </td>
                    <td>{healthChip}</td>
                    <td className="num">
                      <strong>${a.mrr.toLocaleString()}</strong>
                      <span className="muted mono" style={{ fontSize: 10.5 }}>/mo</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(a.tags || []).map(t => <span className="tag" key={t}>{t}</span>)}
                      </div>
                    </td>
                    <td><Avatar id={a.owner} size="sm" /></td>
                    <td className="mono muted" style={{ fontSize: 11 }}>{a.id}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn ghost icon sm" title="Edit"
                          onClick={e => { e.stopPropagation(); setModal(a); }}>
                          <Icon name="note" size={13} />
                        </button>
                        <button className="btn ghost icon sm" title="Delete"
                          style={{ color: 'var(--danger)' }} onClick={e => handleDelete(a, e)}>
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32, fontSize: 12 }}>
                    {search || filter !== 'all' ? 'No accounts match your filters.' : (
                      <div>No accounts yet.{' '}
                        <button className="btn primary sm" style={{ marginLeft: 8 }} onClick={() => setModal('create')}>
                          <Icon name="plus" size={13} />Add first account
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <AccountModal
          account={modal === 'create' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
};
