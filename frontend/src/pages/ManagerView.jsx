import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { Chip, fmtMoney } from '../components/UI/Primitives';
import { api, unwrap } from '../services/api';
import { normalizeOpportunity } from '../utils/normalize';

const STAGE_ORDER = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];
const STAGE_LABEL = {
  prospecting: 'Prospecting', qualification: 'Qualification', proposal: 'Proposal',
  negotiation: 'Negotiation', 'closed-won': 'Closed-Won', 'closed-lost': 'Closed-Lost',
};
const STAGE_COLOR = {
  prospecting: 'var(--st-1)', qualification: 'var(--st-2)', proposal: 'var(--st-3)',
  negotiation: 'var(--st-4)', 'closed-won': 'var(--st-5)', 'closed-lost': 'var(--ink-4)',
};

export const ManagerView = ({ addToast }) => {
  const [opps, setOpps]       = useState([]);
  const [leads, setLeads]     = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      api.getOpportunities(200),
      api.getLeads(200),
      api.getActivities(50),
    ]).then(([oRes, lRes, aRes]) => {
      if (oRes.status === 'fulfilled') setOpps(unwrap(oRes.value));
      if (lRes.status === 'fulfilled') setLeads(unwrap(lRes.value));
      if (aRes.status === 'fulfilled') setActivities(unwrap(aRes.value));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const wonOpps   = opps.filter(o => o.stage === 'closed-won');
  const openOpps  = opps.filter(o => o.stage !== 'closed-won' && o.stage !== 'closed-lost');
  const totalPipe = openOpps.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const totalWon  = wonOpps.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const convRate  = opps.length ? Math.round(wonOpps.length / opps.length * 100) : 0;

  const byStage = STAGE_ORDER.map(stage => ({
    stage,
    label: STAGE_LABEL[stage],
    color: STAGE_COLOR[stage],
    count: opps.filter(o => o.stage === stage).length,
    amount: opps.filter(o => o.stage === stage).reduce((s, o) => s + (Number(o.amount) || 0), 0),
  }));

  const ACT_TYPES = ['call', 'email', 'meeting', 'note', 'task'];
  const ACT_COLORS = { call: 'var(--st-1)', email: 'var(--st-2)', meeting: 'var(--st-3)', note: 'var(--st-4)', task: 'var(--accent)' };
  const byType = ACT_TYPES.map(type => ({
    type,
    count: activities.filter(a => a.type === type).length,
    completed: activities.filter(a => a.type === type && a.status === 'completed').length,
    color: ACT_COLORS[type],
  }));
  const completedActs = activities.filter(a => a.status === 'completed').length;
  const completionRate = activities.length ? Math.round(completedActs / activities.length * 100) : 0;

  const handleClose = async (opp) => {
    if (!window.confirm(`Mark "${opp.name}" as Closed-Won?`)) return;
    setClosing(opp.id);
    try {
      await api.updateOpportunity(opp.id, { stage: 'closed-won' });
      addToast && addToast(`"${opp.name}" marked as Closed-Won`);
      load();
    } catch (e) {
      addToast && addToast(`Error: ${e.message}`);
    } finally {
      setClosing(null);
    }
  };

  const kpis = [
    { label: 'Open pipeline',      value: loading ? '…' : fmtMoney(totalPipe, { compact: true }), sub: `${openOpps.length} open deals` },
    { label: 'Closed revenue',     value: loading ? '…' : fmtMoney(totalWon,  { compact: true }), sub: `${wonOpps.length} won deals` },
    { label: 'Total leads',        value: loading ? '…' : String(leads.length), sub: `${leads.filter(l => l.status === 'qualified' || l.status === 'converted').length} qualified` },
    { label: 'Conversion rate',    value: loading ? '…' : convRate + '%',        sub: `${opps.length} opportunities total` },
  ];

  return (
    <div className="page-inner">
      <div className="page-head">
        <div>
          <div className="page-title">Team metrics</div>
          <div className="page-sub">Pipeline and performance overview</div>
        </div>
        <div className="actions">
          <button className="btn sm" onClick={load}><Icon name="refresh" size={13} />Refresh</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {kpis.map(k => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-foot"><span className="kpi-delta">{k.sub}</span></div>
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* Pipeline par stage */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Pipeline by stage</div>
            <span className="card-sub">{opps.length} deals total</span>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : byStage.map(s => (
              <div key={s.stage} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                    {s.label}
                  </span>
                  <span className="mono muted">
                    <strong>{s.count}</strong> · {fmtMoney(s.amount, { compact: true })}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: opps.length ? (s.count / opps.length * 100) + '%' : '0%',
                    background: s.color,
                    borderRadius: 3,
                    transition: 'width 400ms ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity analytics */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Team activity breakdown</div>
            <span className="card-sub">{activities.length} total · {completionRate}% completed</span>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : activities.length === 0 ? (
              <div style={{ color: 'var(--ink-4)', fontSize: 12, textAlign: 'center' }}>No activities recorded</div>
            ) : (
              <>
                {byType.filter(t => t.count > 0).map(t => (
                  <div key={t.type} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                        {t.type}
                      </span>
                      <span className="mono muted">
                        <strong>{t.count}</strong> · {t.completed} done
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (t.count / activities.length * 100) + '%', background: t.color, borderRadius: 3, transition: 'width 400ms ease' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', gap: 16, fontSize: 12 }}>
                  <div><span className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>{completedActs}</span> <span className="muted">completed</span></div>
                  <div><span className="mono" style={{ color: 'var(--warn)', fontWeight: 600 }}>{activities.length - completedActs}</span> <span className="muted">pending</span></div>
                </div>
              </>
            )}
          </div>

          {/* Recent feed */}
          {!loading && activities.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid var(--line)', padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent</div>
              <div style={{ padding: 0 }}>
                {activities.slice(0, 5).map(a => (
                  <div key={a.id} style={{ padding: '9px 16px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <Icon name={a.type === 'email' ? 'mail' : a.type === 'call' ? 'phone' : a.type === 'meeting' ? 'cal' : 'note'} size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 550, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.subject || 'Untitled'}</div>
                      <div className="muted" style={{ fontSize: 11, textTransform: 'capitalize' }}>{a.type} · {a.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Open deals — Actions */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div className="card-title">Open deals — Actions</div>
          <span className="card-sub">{openOpps.length} deals to action</span>
        </div>
        <div style={{ overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
          ) : openOpps.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
              No open deals
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Stage</th>
                  <th>Account</th>
                  <th className="num">Amount</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {openOpps
                  .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
                  .map(o => (
                    <tr key={o.id}>
                      <td>
                        <div className="cell-name">{o.name}</div>
                      </td>
                      <td>
                        <span className="chip" style={{ background: 'transparent' }}>
                          <span className="dot" style={{ background: STAGE_COLOR[o.stage] || 'var(--ink-4)' }} />
                          {STAGE_LABEL[o.stage] || o.stage}
                        </span>
                      </td>
                      <td className="muted">{o.account?.name || '—'}</td>
                      <td className="num"><strong>{fmtMoney(Number(o.amount) || 0)}</strong></td>
                      <td>
                        <button
                          className="btn primary sm"
                          style={{ fontSize: 11 }}
                          disabled={closing === o.id}
                          onClick={() => handleClose(o)}
                        >
                          <Icon name="check-sm" size={12} />
                          {closing === o.id ? 'Closing…' : 'Close deal'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
