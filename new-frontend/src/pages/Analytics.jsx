import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { api, unwrap } from '../services/api';

export const AnalyticsView = () => {
  const [opps, setOpps]     = useState([]);
  const [leads, setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getOpportunities(500),
      api.getLeads(500),
    ]).then(([oRes, lRes]) => {
      if (oRes.status === 'fulfilled') setOpps(unwrap(oRes.value).map(o => ({ stage: o.stage, amount: Number(o.amount) || 0 })));
      if (lRes.status === 'fulfilled') setLeads(unwrap(lRes.value));
    }).finally(() => setLoading(false));
  }, []);

  const wonOpps      = opps.filter(o => o.stage === 'closed-won');
  const openOpps     = opps.filter(o => o.stage !== 'closed-won' && o.stage !== 'closed-lost');
  const totalWon     = wonOpps.reduce((s, o) => s + o.amount, 0);
  const totalPipe    = openOpps.reduce((s, o) => s + o.amount, 0);
  const convRate     = opps.length ? (wonOpps.length / opps.length * 100).toFixed(1) + '%' : '—';

  const fmtK = n => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

  const qualifiedLeads = leads.filter(l => l.status === 'qualified' || l.status === 'converted').length;
  const proposalOpps   = opps.filter(o => o.stage === 'proposal' || o.stage === 'proposal-sent').length;
  const negotiation    = opps.filter(o => o.stage === 'negotiation').length;

  const funnel = [
    { name: 'Leads created',  v: leads.length },
    { name: 'Qualified',      v: qualifiedLeads },
    { name: 'Proposal sent',  v: proposalOpps },
    { name: 'Negotiation',    v: negotiation },
    { name: 'Closed-Won',     v: wonOpps.length },
  ];
  const funnelMax = funnel[0].v || 1;

  return (
    <div className="page-inner">
      <div className="page-head">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-sub">Revenue, velocity, conversion</div>
        </div>
        <div className="actions">
          <button className="btn sm"><Icon name="more" size={13} />Export</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { l: 'Closed-won revenue', v: loading ? '…' : fmtK(totalWon),    d: `${wonOpps.length} deals won` },
          { l: 'Open pipeline',      v: loading ? '…' : fmtK(totalPipe),   d: `${openOpps.length} open deals` },
          { l: 'Total leads',        v: loading ? '…' : String(leads.length), d: `${qualifiedLeads} qualified` },
          { l: 'Conversion (L→W)',   v: loading ? '…' : convRate,          d: `${opps.length} total opps` },
        ].map(k => (
          <div className="kpi" key={k.l}>
            <div className="kpi-label">{k.l}</div>
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-foot">
              <span className="kpi-delta">{k.d}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Funnel · Lead → Won</div>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
            ) : leads.length === 0 && opps.length === 0 ? (
              <div style={{ color: 'var(--ink-4)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                No data yet — add leads and opportunities to see the funnel.
              </div>
            ) : (
              funnel.map((s, i) => (
                <div key={s.name} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{s.name}</span>
                    <span className="mono"><strong>{s.v}</strong>{' '}
                      <span className="muted">· {funnelMax > 0 ? Math.round(s.v / funnelMax * 100) : 0}%</span>
                    </span>
                  </div>
                  <div style={{ height: 14, background: 'var(--bg-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: (funnelMax > 0 ? s.v / funnelMax * 100 : 0) + '%',
                      background: `oklch(${0.7 - i * 0.04} 0.13 ${258 - i * 18})`,
                      borderRadius: 4,
                      transition: 'width 400ms ease',
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Team leaderboard</div>
            <span className="card-sub">QTD</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: 'var(--ink-4)', fontSize: 12 }}>
            No team data available
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Revenue by source</div>
        </div>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: 'var(--ink-4)', fontSize: 12 }}>
          No revenue data available
        </div>
      </div>
    </div>
  );
};
