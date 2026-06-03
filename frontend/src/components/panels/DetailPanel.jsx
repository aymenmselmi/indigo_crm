import { useState, useEffect, useRef } from 'react';
import { Icon } from '../UI/Icon';
import { fmtMoney, Chip, Avatar } from '../UI/Primitives';
import { api, unwrap } from '../../services/api';

const STAGE_LABELS = {
  prospecting: 'Prospecting', qualification: 'Qualification', proposal: 'Proposal',
  negotiation: 'Negotiation', 'closed-won': 'Closed-Won', 'closed-lost': 'Closed-Lost',
};
const STAGE_COLORS = {
  prospecting: 'var(--st-1)', qualification: 'var(--st-2)', proposal: 'var(--st-3)',
  negotiation: 'var(--st-4)', 'closed-won': 'var(--st-5)', 'closed-lost': 'var(--ink-4)',
};
const ACT_ICONS = { call: 'phone', email: 'mail', meeting: 'cal', task: 'check-sm', note: 'note' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRelative(d) {
  if (!d) return '—';
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  const days = Math.floor(mins / 1440);
  return days < 7 ? `${days}d ago` : fmtDate(d);
}

function ActivityFeed({ activities, loading }) {
  if (loading) return (
    <div style={{ padding: '12px 0', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
  );
  if (!activities.length) return (
    <div className="empty" style={{ padding: 16 }}>No activity recorded</div>
  );
  return activities.slice(0, 6).map(a => (
    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
        <Icon name={ACT_ICONS[a.type] || 'note'} size={11} style={{ color: 'var(--accent)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.subject || 'Untitled'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>
          {a.type} · {fmtRelative(a.createdAt)}
        </div>
      </div>
    </div>
  ));
}

function DealRow({ d }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[d.stage] || 'var(--ink-4)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{STAGE_LABELS[d.stage] || d.stage}</div>
      </div>
      <span className="mono muted" style={{ fontSize: 11, flexShrink: 0 }}>{fmtMoney(Number(d.amount) || 0)}</span>
    </div>
  );
}

const CF_ENTITY_KIND = { account: 'account', contact: 'contact', deal: 'opportunity' };

export const DetailPanel = ({ item, onClose, openQuickAdd, addToast, onDeleted }) => {
  const [relatedDeals, setRelatedDeals] = useState([]);
  const [relatedActs, setRelatedActs]   = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [loadingActs, setLoadingActs]   = useState(false);
  const [cfSchemas, setCfSchemas]       = useState([]);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  const logActivity = (actType) => {
    if (!openQuickAdd) return;
    const { kind, data } = item || {};
    const prefill = { actType };
    if (kind === 'deal' && data?._id) prefill.actOpportunity = data._id;
    if (kind === 'contact' && data?._id) prefill.actContact = data._id;
    openQuickAdd('activity', prefill);
  };

  // Close more menu on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  useEffect(() => {
    const entityType = item ? CF_ENTITY_KIND[item.kind] : null;
    if (!entityType) { setCfSchemas([]); return; }
    api.getCustomFieldSchemas(entityType)
      .then(res => setCfSchemas(Array.isArray(res) ? res : []))
      .catch(() => setCfSchemas([]));
  }, [item?.kind]);

  useEffect(() => {
    if (!item) return;
    setRelatedDeals([]);
    setRelatedActs([]);
    setShowMore(false);
    const { kind, data } = item;

    if (kind === 'account' && data._id) {
      setLoadingDeals(true);
      setLoadingActs(true);
      Promise.all([
        api.getAccountOpportunities(data._id),
        api.getActivities(100),
      ]).then(([oppsRes, actsRes]) => {
        const opps = unwrap(oppsRes);
        const oppIds = new Set(opps.map(o => o.id));
        setRelatedDeals(opps.filter(o => o.stage !== 'closed-won' && o.stage !== 'closed-lost'));
        setRelatedActs(unwrap(actsRes).filter(a => a.relatedOpportunityId && oppIds.has(a.relatedOpportunityId)));
      }).catch(() => {}).finally(() => { setLoadingDeals(false); setLoadingActs(false); });
    }

    if (kind === 'deal' && data._id) {
      setLoadingActs(true);
      api.getOpportunityActivities(data._id)
        .then(res => setRelatedActs(unwrap(res)))
        .catch(() => setRelatedActs([]))
        .finally(() => setLoadingActs(false));
    }

    if (kind === 'contact' && data._id) {
      setLoadingActs(true);
      const fetches = [api.getContactActivities(data._id)];
      if (data._accountId) {
        setLoadingDeals(true);
        fetches.push(api.getAccountOpportunities(data._accountId));
      }
      Promise.all(fetches)
        .then(([actsRes, oppsRes]) => {
          setRelatedActs(unwrap(actsRes));
          if (oppsRes) setRelatedDeals(unwrap(oppsRes).filter(o => o.stage !== 'closed-won' && o.stage !== 'closed-lost'));
        })
        .catch(() => {})
        .finally(() => { setLoadingActs(false); setLoadingDeals(false); });
    }
  }, [item]);

  const handleDelete = async () => {
    if (!item) return;
    const { kind, data } = item;
    const label = data.name || data.title || 'this record';
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setShowMore(false);
    try {
      if (kind === 'account') await api.deleteAccount(data._id);
      else if (kind === 'contact') await api.deleteContact(data._id);
      else if (kind === 'deal') await api.deleteOpportunity(data._id);
      else if (kind === 'task') await api.deleteTask(data._id);
      addToast?.(`${label} deleted`);
      onDeleted?.();
    } catch {
      addToast?.('Failed to delete');
    }
  };

  if (!item) return null;
  const { kind, data } = item;

  let head, fields, related;

  if (kind === 'account') {
    const a = data;
    head = (
      <>
        <div className="avatar lg" style={{ background: 'var(--bg-sunken)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 }}>
          {a.name?.[0] || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{a.name}</div>
          <div className="mono muted" style={{ fontSize: 11 }}>{a.domain} · {a.id}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {a.tier === 'Strategic' ? <Chip tone="accent">Strategic</Chip> : <Chip>{a.tier}</Chip>}
            {(a.tags || []).map(t => <span className="tag" key={t}>{t}</span>)}
          </div>
        </div>
      </>
    );
    fields = [
      ['Industry', a.industry || '—'],
      ['Employees', a.size ? a.size + ' employees' : '—'],
      ['MRR', a.mrr ? `$${Number(a.mrr).toLocaleString()} / mo` : '—'],
      ['ARR', a.mrr ? `$${(Number(a.mrr) * 12).toLocaleString()}` : '—'],
      ['Owner', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Avatar id={a.owner} size="sm" />{a.owner}</span>],
    ];
    related = (
      <>
        <div className="detail-section">
          <div className="detail-label">Open deals</div>
          {loadingDeals ? (
            <div style={{ padding: '12px 0', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
          ) : relatedDeals.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>No open deals</div>
          ) : relatedDeals.map(d => <DealRow key={d.id} d={d} />)}
        </div>
        <div className="detail-section">
          <div className="detail-label">Recent activity</div>
          <ActivityFeed activities={relatedActs} loading={loadingActs} />
        </div>
      </>
    );

  } else if (kind === 'deal') {
    const d = data;
    const rawStage = d._rawStage || d.stage || 'prospecting';
    head = (
      <>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
          <Icon name="trend" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{d.name}</div>
          <div className="mono muted" style={{ fontSize: 11 }}>{d.company} · {d.id}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <span className="chip" style={{ background: 'transparent' }}>
              <span className="dot" style={{ background: STAGE_COLORS[rawStage] || 'var(--ink-4)' }}></span>
              {STAGE_LABELS[rawStage] || rawStage}
            </span>
            {d.prob > 0 && <Chip>{d.prob}% prob</Chip>}
          </div>
        </div>
      </>
    );
    fields = [
      ['Amount',   <strong style={{ fontSize: 14 }}>{fmtMoney(d.amount)}</strong>],
      ['Weighted', fmtMoney(Math.round(d.amount * (d.prob || 0) / 100))],
      ['Close date', d.close || '—'],
      ['Age',      (d.age ?? '—') + (d.age != null ? ' days' : '')],
      ['Account',  d.company || '—'],
    ];
    related = (
      <div className="detail-section">
        <div className="detail-label">Activity</div>
        <ActivityFeed activities={relatedActs} loading={loadingActs} />
      </div>
    );

  } else if (kind === 'task') {
    const t = data;
    head = (
      <>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-sunken)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <Icon name="task" size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
          <div className="mono muted" style={{ fontSize: 11, marginTop: 2 }}>
            {t.id}{t.linked && t.linked !== '—' ? ` · linked to ${t.linked}` : ''}
          </div>
        </div>
      </>
    );
    fields = [
      ['Status',   t.done ? <Chip tone="success" dot>Done</Chip> : <Chip dot>Open</Chip>],
      ['Due',      <span className={`mono due ${t.dueState}`}>{t.due}</span>],
      ['Priority', t.priority === 'high' ? <Chip tone="danger" dot>High</Chip> : t.priority === 'med' ? <Chip>Med</Chip> : <Chip>Low</Chip>],
      ['Owner',    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Avatar id={t.owner} size="sm" />{t.owner}</span>],
    ];

  } else if (kind === 'contact') {
    const c = data;
    head = (
      <>
        <Avatar id={(c.name?.[0] || '?').toUpperCase()} size="lg" name={c.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{c.name}</div>
          <div className="mono muted" style={{ fontSize: 11 }}>{c.title || c.email}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <Chip>{c.status || 'active'}</Chip>
          </div>
        </div>
      </>
    );
    fields = [
      ['Email',      c.email || '—'],
      ['Phone',      c.phone || '—'],
      ['Mobile',     c.mobilePhone || '—'],
      ['Title',      c.title || '—'],
      ['Department', c.department || '—'],
      ['Account',    c.account || '—'],
    ];
    related = (
      <>
        {c._accountId && (
          <div className="detail-section">
            <div className="detail-label">Related deals</div>
            {loadingDeals ? (
              <div style={{ padding: '12px 0', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : relatedDeals.length === 0 ? (
              <div className="empty" style={{ padding: 16 }}>No open deals</div>
            ) : relatedDeals.map(d => <DealRow key={d.id} d={d} />)}
          </div>
        )}
        <div className="detail-section">
          <div className="detail-label">Recent activity</div>
          <ActivityFeed activities={relatedActs} loading={loadingActs} />
        </div>
      </>
    );

  } else {
    head   = <div style={{ fontSize: 15, fontWeight: 600 }}>Detail</div>;
    fields = [];
  }

  return (
    <>
      <div className="detail-overlay" onClick={onClose}></div>
      <div className="detail-panel">
        <div className="detail-head">
          {head}
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="detail-body">
          <div className="detail-section">
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <button className="btn sm" onClick={() => logActivity('email')}><Icon name="mail" size={12} />Email</button>
              <button className="btn sm" onClick={() => logActivity('call')}><Icon name="phone" size={12} />Call</button>
              <button className="btn sm" onClick={() => logActivity('meeting')}><Icon name="cal" size={12} />Meet</button>
              <button className="btn sm" onClick={() => logActivity('note')}><Icon name="note" size={12} />Note</button>
              <div style={{ marginLeft: 'auto', position: 'relative' }} ref={moreRef}>
                <button className="btn ghost icon sm" onClick={() => setShowMore(m => !m)}><Icon name="more" size={13} /></button>
                {showMore && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, boxShadow: 'var(--shadow-lg, 0 4px 16px rgba(0,0,0,.12))', minWidth: 140, padding: '4px 0' }}>
                    <button
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--danger)', fontFamily: 'var(--font)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunken)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      onClick={handleDelete}
                    >
                      Delete…
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="detail-label">Properties</div>
            <div style={{ marginTop: 6 }}>
              {(fields || []).map(([k, v]) => (
                <div className="field-row" key={k}>
                  <div className="field-key">{k}</div>
                  <div className="field-value">{v}</div>
                </div>
              ))}
            </div>
            {cfSchemas.length > 0 && (() => {
              const cf = data.customFields || {};
              const populated = cfSchemas.filter(s => cf[s.name] !== undefined && cf[s.name] !== null && cf[s.name] !== '');
              if (!populated.length) return null;
              return (
                <div style={{ marginTop: 12 }}>
                  <div className="detail-label">Custom fields</div>
                  <div style={{ marginTop: 6 }}>
                    {populated.map(s => {
                      let val = cf[s.name];
                      if (s.fieldType === 'boolean') val = val ? 'Yes' : 'No';
                      return (
                        <div className="field-row" key={s.id}>
                          <div className="field-key">{s.label}</div>
                          <div className="field-value">{String(val)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          {related}
        </div>
      </div>
    </>
  );
};
