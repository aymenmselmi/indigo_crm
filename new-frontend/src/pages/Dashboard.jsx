import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { fmtMoney, Chip, Spark, Avatar } from '../components/UI/Primitives';
import { STAGES } from '../data/seed';
import { api, unwrap } from '../services/api';
import { normalizeOpportunity, normalizeActivity } from '../utils/normalize';

export const Dashboard = ({ openDetail, addToast, user }) => {
  const [deals, setDeals] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getOpportunities(100),
      api.getActivities(20),
    ]).then(([oppsRes, actRes]) => {
      if (oppsRes.status === 'fulfilled') {
        const items = unwrap(oppsRes.value);
        if (items.length > 0) setDeals(items.map(normalizeOpportunity));
      }
      if (actRes.status === 'fulfilled') {
        const items = unwrap(actRes.value);
        if (items.length > 0) setActivity(items.map(normalizeActivity));
      }
    }).finally(() => setLoading(false));
  }, []);

  const openDeals   = deals.filter(d => d.stage !== 'close');
  const closedDeals = deals.filter(d => d.stage === 'close');
  const totalPipe   = openDeals.reduce((s, d) => s + d.amount, 0);
  const wonTotal    = closedDeals.reduce((s, d) => s + d.amount, 0);
  const avgDeal     = openDeals.length ? Math.round(totalPipe / openDeals.length) : 0;
  const winRate     = deals.length ? Math.round((closedDeals.length / deals.length) * 100) : 0;

  const stageGroups = STAGES.map(st => {
    const ds = deals.filter(d => d.stage === st.id);
    return { ...st, count: ds.length, amount: ds.reduce((s, d) => s + d.amount, 0) };
  });

  const userName = user
    ? (user.firstName || user.email?.split('@')[0] || 'there')
    : 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const kpis = [
    { label: 'Pipeline',      value: fmtMoney(totalPipe, { compact: true }), delta: `${openDeals.length} open`,          dir: 'up',   spark: [120, 140, 132, 158, 170, 162, 188, totalPipe / 5000 || 196] },
    { label: 'Closed',        value: fmtMoney(wonTotal,  { compact: true }), delta: `${closedDeals.length} won`,          dir: 'up',   spark: [40, 60, 80, 110, 140, 160, 175, wonTotal / 1000 || 184]   },
    { label: 'Win rate',      value: winRate + '%',                           delta: `${deals.length} total`,              dir: 'up',   spark: [30, 32, 28, 31, 30, 33, 32, winRate || 34]                 },
    { label: 'Avg deal size', value: fmtMoney(avgDeal,   { compact: true }), delta: 'open deals',                         dir: avgDeal > 40000 ? 'up' : 'flat', spark: [54, 52, 50, 48, 51, 49, 47, avgDeal / 1000 || 48] },
    { label: 'Activities',    value: String(activity.length),                 delta: 'recorded',                           dir: 'flat', spark: [12, 14, 11, 18, 16, 19, 17, activity.length || 17]         },
  ];

  const topOpenDeals = deals.filter(d => d.stage !== 'close').sort((a, b) => b.amount - a.amount).slice(0, 6);

  return (
    <div className="page-inner">
      <div className="page-head">
        <div>
          <div className="page-title">Welcome back, {userName}</div>
          <div className="page-sub">
            {today}
            {loading && <span className="muted"> · syncing…</span>}
          </div>
        </div>
        <div className="actions">
          <button className="btn sm"><Icon name="cal" size={13} />Last 30 days<Icon name="chevron-down" size={12} /></button>
          <button className="btn sm"><Icon name="ai" size={13} />Ask Indigo AI</button>
          <button className="btn primary sm"><Icon name="plus" size={13} />New deal</button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-foot">
              <span className={`kpi-delta ${k.dir}`}>
                {k.dir === 'up'   && <Icon name="arrow-up"   size={10} stroke={2.4} />}
                {k.dir === 'down' && <Icon name="arrow-down" size={10} stroke={2.4} />}
                {k.delta}
              </span>
              <Spark data={k.spark} color={k.dir === 'down' ? 'var(--danger)' : 'var(--accent)'} />
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div><div className="card-title">Pipeline by stage</div></div>
          <span className="card-sub">
            {openDeals.length} open · weighted {fmtMoney(openDeals.reduce((s, d) => s + d.amount * d.prob / 100, 0), { compact: true })}
          </span>
          <div className="actions">
            <button className="btn ghost sm">View board <Icon name="arrow-right" size={11} /></button>
          </div>
        </div>
        <div className="pipeline-strip" style={{ borderRadius: 0, border: 0, marginBottom: 0 }}>
          {stageGroups.map(st => (
            <div className="stage-cell" key={st.id} style={{ '--st': st.color }}>
              <div className="stage-name"><span className="dot"></span>{st.name}</div>
              <div className="stage-amount">{fmtMoney(st.amount, { compact: true })}</div>
              <div className="stage-count">{st.count} {st.count === 1 ? 'deal' : 'deals'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Forecast vs target</div>
            <span className="card-sub">8 weeks · $k</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: 'var(--ink-4)', fontSize: 12 }}>
            No forecast data available
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Lead sources</div>
            <span className="card-sub">last 90d</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: 'var(--ink-4)', fontSize: 12 }}>
            No source data available
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, background: 'linear-gradient(180deg, var(--accent-soft) 0%, var(--bg-elev) 60%)', borderColor: 'transparent', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
        <div className="card-head" style={{ borderBottom: '1px solid var(--line)' }}>
          <Icon name="ai" size={15} style={{ color: 'var(--accent)' }} />
          <div className="card-title">Indigo AI · Today's focus</div>
          <span className="card-sub">3 nudges</span>
          <div className="actions"><button className="btn ghost sm">Dismiss all</button></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)' }}>
          {[
            {
              tone: 'danger', label: 'Risk',
              text: openDeals.length > 0
                ? <><strong>{openDeals[0].company}</strong> has an open deal worth <strong>{fmtMoney(openDeals[0].amount)}</strong> in {openDeals[0].stage} stage.</>
                : <>No at-risk deals detected.</>,
              action: 'Draft email',
            },
            {
              tone: 'accent', label: 'Opportunity',
              text: openDeals.length > 1
                ? <><strong>{openDeals[1].name}</strong> — {fmtMoney(openDeals[1].amount)} at {openDeals[1].prob}% probability. High intent signal.</>
                : <>Check pipeline for upsell opportunities.</>,
              action: 'Schedule call',
            },
            {
              tone: 'warn', label: 'Pipeline',
              text: closedDeals.length > 0
                ? <>{closedDeals.length} deal{closedDeals.length > 1 ? 's' : ''} closed worth <strong>{fmtMoney(wonTotal)}</strong>. Track next milestones.</>
                : <>{openDeals.length} open deals worth <strong>{fmtMoney(totalPipe)}</strong> need attention.</>,
              action: 'View pipeline',
            },
          ].map((n, i) => (
            <div key={i} style={{ background: 'var(--bg-elev)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Chip tone={n.tone}>{n.label}</Chip>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink)', flex: 1 }}>{n.text}</div>
              <div>
                <button className="btn sm" onClick={() => addToast(`Action: ${n.action}`)}>
                  <Icon name="sparkle" size={12} />{n.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Top open deals</div>
            <span className="card-sub">by amount</span>
            <div className="actions">
              <button className="btn ghost sm">View all <Icon name="arrow-right" size={11} /></button>
            </div>
          </div>
          <div className="card-body flush">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
                Loading deals…
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Deal</th><th>Stage</th><th>Owner</th>
                    <th className="num">Amount</th><th className="num">Close</th>
                  </tr>
                </thead>
                <tbody>
                  {topOpenDeals.map(d => {
                    const st = STAGES.find(s => s.id === d.stage) || STAGES[0];
                    return (
                      <tr key={d.id} onClick={() => openDetail({ kind: 'deal', data: d })}>
                        <td>
                          <div className="cell-stack"><div>
                            <div className="cell-name">{d.name}</div>
                            <div className="cell-sub">{d.company} · {d.id}</div>
                          </div></div>
                        </td>
                        <td>
                          <span className="chip" style={{ background: 'transparent' }}>
                            <span className="dot" style={{ background: st.color }}></span>{st.name}
                          </span>
                        </td>
                        <td><Avatar id={d.owner} size="sm" /></td>
                        <td className="num"><strong>{fmtMoney(d.amount)}</strong></td>
                        <td className="num mono muted">{d.close}</td>
                      </tr>
                    );
                  })}
                  {topOpenDeals.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 24, fontSize: 12 }}>
                        No open deals
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Activity</div>
            <span className="card-sub">team feed</span>
            <div className="actions">
              <button className="btn ghost icon sm" title="Filter"><Icon name="filter" size={13} /></button>
            </div>
          </div>
          <div className="card-body flush feed">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
                Loading activity…
              </div>
            ) : activity.slice(0, 6).map(a => (
              <div className="feed-item" key={a.id}>
                <div className={`feed-icon ${a.icon === 'default' ? '' : a.icon}`}>
                  <Icon
                    name={
                      a.kind === 'won'     ? 'check-sm'
                      : a.kind === 'email'   ? 'mail'
                      : a.kind === 'call'    ? 'phone'
                      : a.kind === 'meeting' ? 'cal'
                      : a.kind === 'risk'    ? 'flag'
                      : a.kind === 'task'    ? 'task'
                      : 'note'
                    }
                    size={12}
                  />
                </div>
                <div>
                  <div className="feed-text" dangerouslySetInnerHTML={{ __html: a.text }} />
                  <div className="feed-meta">{a.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
