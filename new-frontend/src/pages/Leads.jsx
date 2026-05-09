import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { Chip, fmtMoney } from '../components/UI/Primitives';
import { api, unwrap } from '../services/api';
import { normalizeLead } from '../utils/normalize';

const STATUS_CHIP = {
  new:       <Chip>New</Chip>,
  contacted: <Chip tone="accent">Contacted</Chip>,
  qualified: <Chip tone="success">Qualified</Chip>,
  converted: <Chip tone="success" dot>Converted</Chip>,
  rejected:  <Chip tone="danger">Rejected</Chip>,
};

const SOURCE_LABEL = {
  website: 'Website', email: 'Email', phone: 'Phone',
  referral: 'Referral', event: 'Event', social: 'Social', cold: 'Cold',
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  company: '', title: '', status: 'new', source: 'cold',
  notes: '', estimatedValue: '', leadScore: '',
};

const inp = {
  height: 32, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 12.5,
  color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', width: '100%',
  transition: 'border-color 120ms',
};

const Row = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
);
const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11.5, fontWeight: 550, color: 'var(--ink-2)' }}>{label}</span>
    {children}
  </label>
);

function LeadModal({ lead, onSave, onClose }) {
  const editing = !!lead;
  const [form, setForm]     = useState(lead ? {
    firstName: lead.firstName, lastName: lead.lastName, email: lead.email,
    phone: lead.phone, company: lead.company, title: lead.title,
    status: lead.status, source: lead.source, notes: lead.notes,
    estimatedValue: lead.estimatedValue || '', leadScore: lead.leadScore || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) { setError('First name is required'); return; }
    if (!form.lastName.trim())  { setError('Last name is required');  return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email     || undefined,
        phone:     form.phone     || undefined,
        company:   form.company   || undefined,
        title:     form.title     || undefined,
        status:    form.status,
        source:    form.source,
        notes:     form.notes     || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        leadScore:      form.leadScore      ? Number(form.leadScore)      : undefined,
      };
      if (editing) {
        await api.updateLead(lead._id, payload);
      } else {
        await api.createLead(payload);
      }
      onSave();
    } catch (e) {
      setError(e.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ fontWeight: 600, fontSize: 14 }}>{editing ? 'Edit lead' : 'New lead'}</div>
          <button className="btn ghost icon sm" onClick={onClose} style={{ marginLeft: 'auto' }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <form onSubmit={submit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 'calc(90vh - 60px)' }}>
          <Row>
            <Field label="First name *">
              <input style={inp} value={form.firstName} onChange={e => set('firstName', e.target.value)}
                placeholder="Jane"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--line)')} />
            </Field>
            <Field label="Last name *">
              <input style={inp} value={form.lastName} onChange={e => set('lastName', e.target.value)}
                placeholder="Smith"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--line)')} />
            </Field>
          </Row>
          <Row>
            <Field label="Email">
              <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="jane@company.com"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--line)')} />
            </Field>
            <Field label="Phone">
              <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+1 555 000 0000"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--line)')} />
            </Field>
          </Row>
          <Row>
            <Field label="Company">
              <input style={inp} value={form.company} onChange={e => set('company', e.target.value)}
                placeholder="Acme Inc."
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--line)')} />
            </Field>
            <Field label="Title">
              <input style={inp} value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="VP of Sales"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--line)')} />
            </Field>
          </Row>
          <Row>
            <Field label="Status">
              <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <Field label="Source">
              <select style={inp} value={form.source} onChange={e => set('source', e.target.value)}>
                {Object.entries(SOURCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Estimated value ($)">
              <input style={inp} type="number" min="0" value={form.estimatedValue}
                onChange={e => set('estimatedValue', e.target.value)}
                placeholder="0"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--line)')} />
            </Field>
            <Field label="Lead score (0–100)">
              <input style={inp} type="number" min="0" max="100" value={form.leadScore}
                onChange={e => set('leadScore', e.target.value)}
                placeholder="0"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--line)')} />
            </Field>
          </Row>
          <Field label="Notes">
            <textarea
              value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Additional context…"
              style={{ ...inp, height: 72, padding: '8px 10px', resize: 'vertical' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--line)')}
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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConvertConfirm({ lead, onConfirm, onClose, converting }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Convert lead</div>
          <button className="btn ghost icon sm" onClick={onClose} style={{ marginLeft: 'auto' }}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Converting <strong>{lead.name}</strong> will automatically create:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { icon: 'company', label: 'Account', desc: lead.company || `${lead.name}` },
              { icon: 'user',    label: 'Contact', desc: lead.name },
              { icon: 'trend',   label: 'Opportunity', desc: `${lead.name} — Opportunity` },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-sunken)', borderRadius: 7, fontSize: 12.5 }}>
                <Icon name={item.icon} size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div>
                  <span style={{ fontWeight: 550 }}>{item.label}</span>
                  <span style={{ color: 'var(--ink-3)' }}> · {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn sm" onClick={onClose}>Cancel</button>
            <button className="btn primary sm" onClick={onConfirm} disabled={converting}>
              {converting ? 'Converting…' : 'Convert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const LeadsView = ({ addToast }) => {
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(null); // null | 'create' | lead object (edit)
  const [converting, setConverting] = useState(null); // lead being confirmed
  const [convLoading, setConvLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.getLeads(200)
      .then(res => setLeads(unwrap(res).map(normalizeLead)))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = () => {
    setModal(null);
    load();
    addToast && addToast('Lead saved');
  };

  const handleConvert = async () => {
    if (!converting) return;
    setConvLoading(true);
    try {
      await api.convertLead(converting._id);
      addToast && addToast(`${converting.name} converted → Account, Contact, Opportunity`);
      setConverting(null);
      load();
    } catch (e) {
      addToast && addToast(`Error: ${e.message}`);
    } finally {
      setConvLoading(false);
    }
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return;
    try {
      await api.deleteLead(lead._id);
      addToast && addToast(`Lead "${lead.name}" deleted`);
      load();
    } catch (e) {
      addToast && addToast(`Error: ${e.message}`);
    }
  };

  const STATUSES = ['all', 'new', 'contacted', 'qualified', 'converted', 'rejected'];

  const rows = leads.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.company.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = Object.fromEntries(STATUSES.map(s => [s, s === 'all' ? leads.length : leads.filter(l => l.status === s).length]));

  return (
    <>
      <div className="filters">
        {STATUSES.map(s => (
          <button key={s} className={`filter-pill ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}
            style={{ textTransform: 'capitalize' }}>
            {s === 'all' ? 'All' : s} <span className="mono muted">{counts[s]}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search leads"
              style={{
                height: 24, padding: '0 8px 0 26px', border: '1px solid var(--line)',
                borderRadius: 5, background: 'var(--bg-elev)', fontFamily: 'inherit',
                fontSize: 11.5, outline: 'none', width: 200, color: 'var(--ink)',
              }}
            />
          </div>
          <button className="btn accent sm" onClick={() => setModal('create')}>
            <Icon name="plus" size={13} />New lead
          </button>
        </div>
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading leads…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Company</th>
                <th>Status</th>
                <th>Source</th>
                <th className="num">Score</th>
                <th className="num">Est. value</th>
                <th>Age</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id}>
                  <td>
                    <div className="cell-stack">
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: `oklch(0.6 0.14 ${l.name.charCodeAt(0) * 7 % 360})`,
                        display: 'grid', placeItems: 'center',
                        fontSize: 11, fontWeight: 600, color: 'white',
                      }}>
                        {l.firstName[0]}{l.lastName[0]}
                      </div>
                      <div>
                        <div className="cell-name">{l.name}</div>
                        <div className="cell-sub">{l.email || l.phone || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{l.company || '—'}</td>
                  <td>{STATUS_CHIP[l.status] || <Chip>{l.status}</Chip>}</td>
                  <td><span className="tag">{SOURCE_LABEL[l.source] || l.source}</span></td>
                  <td className="num">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{ width: 32, height: 4, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: Math.min(l.leadScore, 100) + '%', background: 'var(--accent)', borderRadius: 2 }} />
                      </div>
                      <span className="mono" style={{ fontSize: 11 }}>{l.leadScore}</span>
                    </div>
                  </td>
                  <td className="num">
                    {l.estimatedValue > 0 ? <strong>{fmtMoney(l.estimatedValue, { compact: true })}</strong> : <span className="muted">—</span>}
                  </td>
                  <td className="mono muted" style={{ fontSize: 11 }}>{l.age}d</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {l.status !== 'converted' && l.status !== 'rejected' && (
                        <button className="btn accent sm" style={{ fontSize: 11 }} onClick={() => setConverting(l)}>
                          Convert
                        </button>
                      )}
                      <button className="btn ghost icon sm" onClick={() => setModal(l)} title="Edit">
                        <Icon name="note" size={13} />
                      </button>
                      <button className="btn ghost icon sm" onClick={() => handleDelete(l)} title="Delete"
                        style={{ color: 'var(--danger)' }}>
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32, fontSize: 12 }}>
                    {search || filter !== 'all' ? 'No leads match your filters.' : (
                      <div>
                        No leads yet.{' '}
                        <button className="btn primary sm" style={{ marginLeft: 8 }} onClick={() => setModal('create')}>
                          <Icon name="plus" size={13} />Add first lead
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
        <LeadModal
          lead={modal === 'create' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {converting && (
        <ConvertConfirm
          lead={converting}
          onConfirm={handleConvert}
          onClose={() => setConverting(null)}
          converting={convLoading}
        />
      )}
    </>
  );
};
