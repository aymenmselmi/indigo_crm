import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { fmtMoney, Avatar } from '../components/UI/Primitives';
import { STAGES } from '../utils/stages';
import { api, unwrap } from '../services/api';
import { normalizeOpportunity } from '../utils/normalize';

const CLOSE_FILTERS = [
  { id: 'all',     label: 'Any close date' },
  { id: 'overdue', label: 'Overdue'        },
  { id: 'month',   label: 'This month'     },
  { id: 'quarter', label: 'This quarter'   },
  { id: 'next-q',  label: 'Next quarter'   },
];

function inCurrentQuarter(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3);
}

function inNextQuarter(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const nextQ = Math.floor(now.getMonth() / 3) + 1;
  const nextQYear = nextQ > 3 ? now.getFullYear() + 1 : now.getFullYear();
  const nextQMonth = (nextQ % 4) * 3;
  return d.getFullYear() === nextQYear && Math.floor(d.getMonth() / 3) === nextQ % 4;
}

export const PipelineView = ({ openDetail, addToast, openQuickAdd, membersById = {} }) => {
  const [deals, setDeals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [mine, setMine]           = useState(false);
  const [closeFilter, setCloseFilter] = useState('all');
  const [viewMode, setViewMode]   = useState('kanban');
  const [dragId, setDragId]       = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const load = (mineFilter = mine) => {
    api.getOpportunities(100, mineFilter)
      .then(res => {
        const items = unwrap(res);
        setDeals(items.map(normalizeOpportunity));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onDrop = (stageId) => {
    if (!dragId) return;
    const deal = deals.find(d => d.id === dragId);
    if (deal && deal.stage !== stageId) {
      setDeals(deals.map(d => d.id === dragId ? { ...d, stage: stageId } : d));
      const stName = STAGES.find(s => s.id === stageId)?.name || stageId;
      addToast(`${deal.name} → ${stName}`);
      if (deal._id) {
        const BE_STAGE = { lead: 'prospecting', qualify: 'qualification', propose: 'proposal', negotiate: 'negotiation', close: 'closed-won' };
        api.updateOpportunity(deal._id, { stage: BE_STAGE[stageId] || stageId }).catch(() => {});
      }
    }
    setDragId(null);
    setDragOverStage(null);
  };

  const now = new Date();
  const filteredDeals = deals.filter(d => {
    if (closeFilter === 'all') return true;
    const cd = d._closeDate ? new Date(d._closeDate) : null;
    if (closeFilter === 'overdue') return cd && cd < now && d._rawStage !== 'closed-won' && d._rawStage !== 'closed-lost';
    if (closeFilter === 'month')   return cd && cd.getFullYear() === now.getFullYear() && cd.getMonth() === now.getMonth();
    if (closeFilter === 'quarter') return inCurrentQuarter(d._closeDate);
    if (closeFilter === 'next-q')  return inNextQuarter(d._closeDate);
    return true;
  });

  const totalByStage = STAGES.map(st => {
    const ds = filteredDeals.filter(d => d.stage === st.id);
    return { ...st, count: ds.length, amount: ds.reduce((s, d) => s + d.amount, 0) };
  });

  return (
    <>
      <div className="filters">
        <button className={`filter-pill ${mine ? 'active' : ''}`} onClick={() => { const n = !mine; setMine(n); load(n); }}>My pipeline</button>
        <button className={`filter-pill ${!mine ? 'active' : ''}`} onClick={() => { setMine(false); load(false); }}>All open</button>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '4px 4px' }}></div>
        {CLOSE_FILTERS.map(f => (
          <button key={f.id} className={`filter-pill ${closeFilter === f.id ? 'active' : ''}`} onClick={() => setCloseFilter(f.id)}>
            {f.id !== 'all' && <Icon name="filter" size={11} />}{f.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="muted mono" style={{ fontSize: 11 }}>
            Total {fmtMoney(filteredDeals.reduce((s, d) => s + d.amount, 0), { compact: true })}
          </span>
          <button className={`btn ghost sm icon ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')} title="Kanban view"><Icon name="kanban" size={13} /></button>
          <button className={`btn ghost sm icon ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view"><Icon name="check-list" size={13} /></button>
          <button className="btn accent sm" onClick={() => openQuickAdd && openQuickAdd('deal')}><Icon name="plus" size={13} />New deal</button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-4)' }}>Loading pipeline…</div>
      )}

      {viewMode === 'list' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Deal</th>
                <th>Company</th>
                <th>Stage</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Prob%</th>
                <th>Close</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '24px 0' }}>No deals</td></tr>
              ) : filteredDeals.map(d => {
                const st = STAGES.find(s => s.id === d.stage);
                return (
                  <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => openDetail({ kind: 'deal', data: d })}>
                    <td style={{ fontWeight: 500 }}>{d.name}</td>
                    <td className="muted">{d.company || '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: st?.color || 'var(--ink-4)', flexShrink: 0 }} />
                        {st?.name || d.stage}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{fmtMoney(d.amount)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{d.prob}%</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{d.close || '—'}</td>
                    <td><Avatar ownerId={d.ownerId} membersById={membersById} size="sm" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', padding: '14px 16px' }}>
          <div className="board">
            {totalByStage.map(st => {
              const ds = filteredDeals.filter(d => d.stage === st.id);
              return (
                <div
                  className="column"
                  key={st.id}
                  onDragOver={e => { e.preventDefault(); setDragOverStage(st.id); }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={() => onDrop(st.id)}
                  style={{ background: dragOverStage === st.id ? 'var(--accent-soft)' : 'var(--bg-sunken)', transition: 'background 120ms' }}
                >
                  <div className="column-head" style={{ '--st': st.color }}>
                    <span className="column-name">{st.name}</span>
                    <span className="column-meta">{st.count}</span>
                    <span style={{ marginLeft: 'auto' }} className="mono" title="Stage value">
                      <strong style={{ fontSize: 12, color: 'var(--ink)' }}>{fmtMoney(st.amount, { compact: true })}</strong>
                    </span>
                    <button className="btn ghost icon sm" onClick={() => openQuickAdd && openQuickAdd('deal')}><Icon name="plus" size={13} /></button>
                  </div>
                  <div className="column-body">
                    {ds.map(d => (
                      <div
                        key={d.id}
                        className={`deal-card ${dragId === d.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => setDragId(d.id)}
                        onDragEnd={() => { setDragId(null); setDragOverStage(null); }}
                        onClick={() => openDetail({ kind: 'deal', data: d })}
                      >
                        <div className="deal-name">{d.name}</div>
                        <div className="deal-company">{d.company}</div>
                        <div className="deal-amount">{fmtMoney(d.amount)}</div>
                        <div className="deal-foot">
                          <Avatar ownerId={d.ownerId} membersById={membersById} size="sm" />
                          <div className="deal-progress" style={{ '--st': st.color }}>
                            <div className="deal-progress-fill" style={{ width: d.prob + '%', background: st.color }}></div>
                          </div>
                          <span className="mono muted" style={{ fontSize: 10.5 }}>{d.prob}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                          <span>{d.id}</span>
                          <span>{d.close} · {d.age}d</span>
                        </div>
                      </div>
                    ))}
                    {ds.length === 0 && (
                      <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>Drop here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
