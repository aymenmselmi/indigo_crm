import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { Chip, Avatar, fmtMoney } from '../components/UI/Primitives';
import { STAGES } from '../data/seed';
import { api, unwrap } from '../services/api';
import { normalizeOpportunity } from '../utils/normalize';

const STAGE_LABEL = Object.fromEntries(STAGES.map(s => [s.id, s.name]));
const STAGE_COLOR = Object.fromEntries(STAGES.map(s => [s.id, s.color]));

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
  name: '', stage: 'prospecting', amount: '', probability: '',
  expectedCloseDate: '', accountId: '', description: '',
};

const BACKEND_STAGES = [
  { value: 'prospecting',  label: 'Prospecting'  },
  { value: 'qualification', label: 'Qualification' },
  { value: 'proposal',     label: 'Proposal'      },
  { value: 'negotiation',  label: 'Negotiation'   },
  { value: 'closed-won',   label: 'Closed-Won'    },
  { value: 'closed-lost',  label: 'Closed-Lost'   },
];

function DealModal({ deal, accounts, onSave, onClose }) {
  const editing = !!deal;
  const [form, setForm] = useState(deal ? {
    name:               deal.name,
    stage:              deal._rawStage || 'prospecting',
    amount:             deal.amount    || '',
    probability:        deal.prob      || '',
    expectedCloseDate:  deal._closeDate || '',
    accountId:          deal._accountId || '',
    description:        deal.description || '',
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
        name:              form.name.trim(),
        stage:             form.stage,
        amount:            form.amount      ? Number(form.amount)      : undefined,
        probability:       form.probability ? Number(form.probability) : undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
        accountId:         form.accountId  || undefined,
        description:       form.description || undefined,
      };
      if (editing) await api.updateOpportunity(deal._id, payload);
      else         await api.createOpportunity(payload);
      onSave();
    } catch (e) {
      setError(e.message || 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ fontWeight: 600, fontSize: 14 }}>{editing ? 'Edit deal' : 'New deal'}</div>
          <button className="btn ghost icon sm" onClick={onClose} style={{ marginLeft: 'auto' }}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <form onSubmit={submit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 'calc(90vh - 60px)' }}>
          <Field label="Deal name *">
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme renewal Q3" onFocus={focus} onBlur={blur} />
          </Field>
          <Row>
            <Field label="Stage">
              <select style={inp} value={form.stage} onChange={e => set('stage', e.target.value)}>
                {BACKEND_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Account">
              <select style={inp} value={form.accountId} onChange={e => set('accountId', e.target.value)}>
                <option value="">No account</option>
                {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Amount ($)">
              <input style={inp} type="number" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="50000" onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Probability (%)">
              <input style={inp} type="number" min="0" max="100" value={form.probability} onChange={e => set('probability', e.target.value)} placeholder="50" onFocus={focus} onBlur={blur} />
            </Field>
          </Row>
          <Field label="Expected close date">
            <input style={inp} type="date" value={form.expectedCloseDate} onChange={e => set('expectedCloseDate', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const OpportunitiesView = ({ openDetail }) => {
  const [deals, setDeals]     = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState('amount');
  const [sortDir, setSortDir] = useState('desc');
  const [modal, setModal]     = useState(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      api.getOpportunities(200),
      api.getAccounts(200),
    ]).then(([oRes, aRes]) => {
      if (oRes.status === 'fulfilled') setDeals(unwrap(oRes.value).map(normalizeOpportunity));
      if (aRes.status === 'fulfilled') setAccounts(unwrap(aRes.value).map(a => ({ _id: a.id, name: a.name })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = () => { setModal(null); load(); };

  const handleDelete = async (d, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete deal "${d.name}"?`)) return;
    try {
      await api.deleteOpportunity(d._id);
      load();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const rows = deals
    .filter(d => {
      if (filter === 'open' && (d.stage === 'close' || d._rawStage === 'closed-lost')) return false;
      if (filter === 'won'  && d._rawStage !== 'closed-won') return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) &&
          !d.company.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let v = 0;
      if (sortKey === 'amount') v = a.amount - b.amount;
      else if (sortKey === 'name')  v = a.name.localeCompare(b.name);
      else if (sortKey === 'stage') v = a.stage.localeCompare(b.stage);
      else if (sortKey === 'prob')  v = a.prob - b.prob;
      return sortDir === 'desc' ? -v : v;
    });

  const totalPipe = deals.filter(d => d._rawStage !== 'closed-won' && d._rawStage !== 'closed-lost').reduce((s, d) => s + d.amount, 0);
  const totalWon  = deals.filter(d => d._rawStage === 'closed-won').reduce((s, d) => s + d.amount, 0);

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span style={{ opacity: 0.3 }}> ↕</span>;
    return <span style={{ color: 'var(--accent)' }}> {sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <>
      <div className="filters">
        <button className={`filter-pill ${filter === 'all'  ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All <span className="mono muted">{deals.length}</span>
        </button>
        <button className={`filter-pill ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>
          Open <span className="mono muted">{deals.filter(d => d._rawStage !== 'closed-won' && d._rawStage !== 'closed-lost').length}</span>
        </button>
        <button className={`filter-pill ${filter === 'won'  ? 'active' : ''}`} onClick={() => setFilter('won')}>
          Won <span className="mono muted">{deals.filter(d => d._rawStage === 'closed-won').length}</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {filter !== 'won' && (
            <span className="mono muted" style={{ fontSize: 11 }}>
              Pipeline {fmtMoney(totalPipe, { compact: true })}
            </span>
          )}
          {filter === 'won' && (
            <span className="mono muted" style={{ fontSize: 11 }}>
              Won {fmtMoney(totalWon, { compact: true })}
            </span>
          )}
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search deals"
              style={{
                height: 24, padding: '0 8px 0 26px', border: '1px solid var(--line)',
                borderRadius: 5, background: 'var(--bg-elev)', fontFamily: 'inherit',
                fontSize: 11.5, outline: 'none', width: 200, color: 'var(--ink)',
              }}
            />
          </div>
          <button className="btn accent sm" onClick={() => setModal('create')}>
            <Icon name="plus" size={13} />New deal
          </button>
        </div>
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
            Loading opportunities…
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                  Deal <SortIcon k="name" />
                </th>
                <th onClick={() => toggleSort('stage')} style={{ cursor: 'pointer' }}>
                  Stage <SortIcon k="stage" />
                </th>
                <th onClick={() => toggleSort('amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  Amount <SortIcon k="amount" />
                </th>
                <th onClick={() => toggleSort('prob')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  Prob <SortIcon k="prob" />
                </th>
                <th>Close</th>
                <th>Account</th>
                <th>Owner</th>
                <th className="mono">ID</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(d => {
                const stageColor = STAGE_COLOR[d.stage] || 'var(--ink-4)';
                const stageLabel = STAGE_LABEL[d.stage] || d.stage;
                return (
                  <tr key={d._id} onClick={() => openDetail && openDetail({ kind: 'deal', data: d })}>
                    <td>
                      <div className="cell-stack">
                        <div>
                          <div className="cell-name">{d.name}</div>
                          <div className="cell-sub">{d.age}d old</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="chip" style={{ background: 'transparent' }}>
                        <span className="dot" style={{ background: stageColor }}></span>
                        {stageLabel}
                      </span>
                    </td>
                    <td className="num"><strong>{fmtMoney(d.amount)}</strong></td>
                    <td className="num">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <div style={{ width: 36, height: 4, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: d.prob + '%', background: stageColor, borderRadius: 2 }} />
                        </div>
                        <span className="mono muted" style={{ fontSize: 11 }}>{d.prob}%</span>
                      </div>
                    </td>
                    <td className="mono muted" style={{ fontSize: 11.5 }}>{d.close}</td>
                    <td className="muted">{d.company}</td>
                    <td><Avatar id={d.owner} size="sm" /></td>
                    <td className="mono muted" style={{ fontSize: 11 }}>{d.id}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn ghost icon sm" title="Edit"
                          onClick={e => { e.stopPropagation(); setModal(d); }}>
                          <Icon name="note" size={13} />
                        </button>
                        <button className="btn ghost icon sm" title="Delete"
                          style={{ color: 'var(--danger)' }} onClick={e => handleDelete(d, e)}>
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32, fontSize: 12 }}>
                    {search || filter !== 'all' ? 'No deals match your filters.' : (
                      <div>No deals yet.{' '}
                        <button className="btn primary sm" style={{ marginLeft: 8 }} onClick={() => setModal('create')}>
                          <Icon name="plus" size={13} />Create first deal
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
        <DealModal
          deal={modal === 'create' ? null : modal}
          accounts={accounts}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
};
