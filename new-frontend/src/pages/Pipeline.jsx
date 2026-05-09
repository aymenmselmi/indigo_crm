import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { fmtMoney, Avatar } from '../components/UI/Primitives';
import { STAGES } from '../data/seed';
import { api, unwrap } from '../services/api';
import { normalizeOpportunity } from '../utils/normalize';

export const PipelineView = ({ openDetail, addToast }) => {
  const [deals, setDeals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dragId, setDragId]       = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  useEffect(() => {
    api.getOpportunities(100)
      .then(res => {
        const items = unwrap(res);
        if (items.length > 0) setDeals(items.map(normalizeOpportunity));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const totalByStage = STAGES.map(st => {
    const ds = deals.filter(d => d.stage === st.id);
    return { ...st, count: ds.length, amount: ds.reduce((s, d) => s + d.amount, 0) };
  });

  return (
    <>
      <div className="filters">
        <button className="filter-pill active">My pipeline</button>
        <button className="filter-pill">Team</button>
        <button className="filter-pill">All open</button>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '4px 4px' }}></div>
        <button className="filter-pill"><Icon name="filter" size={11} />Owner: Anyone</button>
        <button className="filter-pill"><Icon name="filter" size={11} />Close: Q2 2026</button>
        <button className="filter-pill"><Icon name="plus" size={11} />Filter</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="muted mono" style={{ fontSize: 11 }}>
            Total {fmtMoney(totalByStage.reduce((s, st) => s + st.amount, 0), { compact: true })}
          </span>
          <button className="btn ghost sm icon"><Icon name="kanban" size={13} /></button>
          <button className="btn ghost sm icon"><Icon name="check-list" size={13} /></button>
          <button className="btn accent sm"><Icon name="plus" size={13} />New deal</button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-4)' }}>Loading pipeline…</div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 16px' }}>
        <div className="board">
          {totalByStage.map(st => {
            const ds = deals.filter(d => d.stage === st.id);
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
                  <button className="btn ghost icon sm"><Icon name="plus" size={13} /></button>
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
                        <Avatar id={d.owner} size="sm" />
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
    </>
  );
};
