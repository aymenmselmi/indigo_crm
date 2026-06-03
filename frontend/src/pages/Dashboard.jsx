import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { fmtMoney, Chip, Spark, Avatar } from '../components/UI/Primitives';
import { STAGES } from '../utils/stages';
import { api, unwrap } from '../services/api';
import { normalizeOpportunity, normalizeActivity, normalizeTask } from '../utils/normalize';

export const Dashboard = ({ openDetail, addToast, openQuickAdd, user, refreshKey = 0, setView }) => {
  const [deals, setDeals] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.getOpportunities(100),
      api.getActivities(20),
      api.getMyTasks(),
    ]).then(([oppsRes, actRes, tasksRes]) => {
      if (oppsRes.status === 'fulfilled') {
        const items = unwrap(oppsRes.value);
        setDeals(items.length > 0 ? items.map(normalizeOpportunity) : []);
      }
      if (actRes.status === 'fulfilled') {
        const items = unwrap(actRes.value);
        setActivity(items.length > 0 ? items.map(normalizeActivity) : []);
      }
      if (tasksRes.status === 'fulfilled') {
        const items = unwrap(tasksRes.value);
        setTasks(items.length > 0 ? items.map(normalizeTask) : []);
      }
    }).finally(() => setLoading(false));
  }, [refreshKey]);

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

  const topOpenDeals = deals.filter(d => d.stage !== 'close').sort((a, b) => b.amount - a.amount).slice(0, 8);

  // 5-month rolling forecast grouped by expected close date
  const forecastMonths = (() => {
    const now = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const isNow = i === 0;
      const monthDeals = openDeals.filter(deal => deal._closeDate && deal._closeDate.slice(0, 7) === key);
      const weighted   = monthDeals.reduce((s, x) => s + x.amount * x.prob / 100, 0);
      const committed  = monthDeals.filter(x => x.prob >= 75).reduce((s, x) => s + x.amount, 0);
      return { label, weighted, committed, count: monthDeals.length, isNow };
    });
  })();
  const forecastMax = Math.max(...forecastMonths.map(m => m.weighted), 1);

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
          <button className="btn primary sm" onClick={() => openQuickAdd && openQuickAdd('deal')}><Icon name="plus" size={13} />New deal</button>
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
            <button className="btn ghost sm" onClick={() => setView && setView('pipeline')}>View board <Icon name="arrow-right" size={11} /></button>
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

      {/* ── Sales Forecast + Deal Type ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>

        {/* Sales Forecast bar chart */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Sales Forecast</div>
            <span className="card-sub">total forecasted value</span>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            {(() => {
              const weighted   = openDeals.reduce((s, d) => s + d.amount * d.prob / 100, 0);
              const committed  = openDeals.filter(d => d.prob >= 75).reduce((s, d) => s + d.amount, 0);
              const bars = [
                { label: 'Pipeline',  value: totalPipe,  count: openDeals.length,                             color: '#4361ee' },
                { label: 'Weighted',  value: weighted,   count: openDeals.filter(d => d.prob >= 25).length,   color: '#3a7bd5' },
                { label: 'Committed', value: committed,  count: openDeals.filter(d => d.prob >= 75).length,   color: '#4cc9f0' },
              ];
              const yMax  = Math.max(...bars.map(b => b.value), 1);
              const yStep = Math.pow(10, Math.floor(Math.log10(yMax))) * (yMax / Math.pow(10, Math.floor(Math.log10(yMax))) > 4 ? 2 : 1);
              const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(yStep * (i + 1)));
              const chartH = 160;

              return (
                <>
                  <div style={{ display: 'flex', gap: 0, height: chartH }}>
                    {/* Y axis */}
                    <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', paddingRight: 8, paddingBottom: 2, paddingTop: 2 }}>
                      {[0, ...yTicks].map((v, i) => (
                        <span key={i} style={{ fontSize: 10, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                          ${v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                        </span>
                      ))}
                    </div>
                    {/* Chart area */}
                    <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                      {/* Grid lines */}
                      {yTicks.map((v, i) => (
                        <div key={i} style={{
                          position: 'absolute', left: 0, right: 0,
                          bottom: `${(v / (yTicks[yTicks.length - 1] || 1)) * 100}%`,
                          borderTop: '1px dashed var(--line)',
                        }} />
                      ))}
                      {/* Bars */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-evenly', padding: '0 16px' }}>
                        {bars.map((b, i) => {
                          const pct = Math.max((b.value / (yTicks[yTicks.length - 1] || 1)) * 100, b.value > 0 ? 3 : 0);
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 52 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{b.count}</span>
                              <div style={{
                                width: '100%', height: `${pct}%`, minHeight: b.value > 0 ? 6 : 0,
                                background: b.color, borderRadius: '4px 4px 0 0',
                                transition: 'height 0.4s ease',
                              }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* X labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-evenly', paddingLeft: 32, marginTop: 6 }}>
                    {bars.map((b, i) => (
                      <div key={i} style={{ width: 52, textAlign: 'center', fontSize: 11, color: 'var(--ink-3)' }}>{b.label}</div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {bars.map((b, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-3)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color, display: 'inline-block', flexShrink: 0 }} />
                        {b.label}
                      </span>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Deal Type radar chart */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Deal Type</div>
            <span className="card-sub">by pipeline stage</span>
          </div>
          <div className="card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(() => {
              const stageKeys = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];
              const stageLabels = ['Prospect', 'Qualify', 'Propose', 'Negotiate', 'Won', 'Lost'];
              const pending = stageKeys.map(s => deals.filter(d => d._rawStage === s && s !== 'closed-won' && s !== 'closed-lost').length);
              const won     = stageKeys.map(s => s === 'closed-won'  ? deals.filter(d => d._rawStage === s).length : 0);
              const lost    = stageKeys.map(s => s === 'closed-lost' ? deals.filter(d => d._rawStage === s).length : 0);

              const n   = stageKeys.length;
              const sz  = 200;
              const cx  = sz / 2, cy = sz / 2;
              const R   = sz * 0.36;
              const maxV = Math.max(...pending, ...won, ...lost, 1);

              const angle = (i) => (i * 2 * Math.PI) / n - Math.PI / 2;
              const pt    = (i, ratio) => ({
                x: cx + R * ratio * Math.cos(angle(i)),
                y: cy + R * ratio * Math.sin(angle(i)),
              });
              const poly  = (vals) => vals.map((v, i) => { const p = pt(i, Math.max(v / maxV, 0.04)); return `${p.x},${p.y}`; }).join(' ');

              const series = [
                { vals: pending, fill: 'rgba(253,196,28,0.25)',  stroke: '#fdc41c', label: 'Pending' },
                { vals: lost,    fill: 'rgba(240,68,56,0.25)',   stroke: '#f04438', label: 'Loss'    },
                { vals: won,     fill: 'rgba(18,183,106,0.25)',  stroke: '#12b76a', label: 'Won'     },
              ];

              return (
                <>
                  <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ overflow: 'visible' }}>
                    {/* Grid rings */}
                    {[0.33, 0.66, 1].map((lvl, li) => (
                      <polygon key={li}
                        points={stageKeys.map((_, i) => { const p = pt(i, lvl); return `${p.x},${p.y}`; }).join(' ')}
                        fill="none" stroke="var(--line)" strokeWidth="1" />
                    ))}
                    {/* Axis lines */}
                    {stageKeys.map((_, i) => {
                      const outer = pt(i, 1);
                      return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="var(--line)" strokeWidth="1" />;
                    })}
                    {/* Series polygons */}
                    {series.map((s, si) => (
                      <polygon key={si} points={poly(s.vals)} fill={s.fill} stroke={s.stroke} strokeWidth="2" strokeLinejoin="round" />
                    ))}
                    {/* Dots */}
                    {series.map((s, si) =>
                      s.vals.map((v, i) => {
                        const p = pt(i, Math.max(v / maxV, 0.04));
                        return <circle key={`${si}-${i}`} cx={p.x} cy={p.y} r="3" fill={s.stroke} />;
                      })
                    )}
                    {/* Axis labels */}
                    {stageKeys.map((_, i) => {
                      const a   = angle(i);
                      const lx  = cx + (R + 18) * Math.cos(a);
                      const ly  = cy + (R + 18) * Math.sin(a);
                      return (
                        <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                          style={{ fontSize: 9, fill: 'var(--ink-3)', fontFamily: 'var(--font)' }}>
                          {stageLabels[i]}
                        </text>
                      );
                    })}
                  </svg>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 4, justifyContent: 'center' }}>
                    {series.map((s, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-3)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.stroke, display: 'inline-block' }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── My Tasks ───────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div className="card-title">My tasks</div>
          <span className="card-sub">
            {tasks.filter(t => !t.done).length} open
            {tasks.filter(t => t.dueState === 'overdue' && !t.done).length > 0 && (
              <> · <span style={{ color: 'var(--danger)' }}>{tasks.filter(t => t.dueState === 'overdue' && !t.done).length} overdue</span></>
            )}
          </span>
          <div className="actions">
            <button className="btn primary sm" onClick={() => openQuickAdd && openQuickAdd('task')}>
              <Icon name="plus" size={13} />New task
            </button>
          </div>
        </div>
        <div className="card-body flush">
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading tasks…</div>
          ) : tasks.filter(t => !t.done).length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
              No open tasks — you're all caught up.
            </div>
          ) : (
            tasks.filter(t => !t.done).slice(0, 8).map(t => (
              <div
                key={t.id}
                className="task-row"
                onClick={() => openDetail({ kind: 'task', data: t })}
              >
                <div className="task-check" onClick={e => {
                  e.stopPropagation();
                  setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: true } : x));
                  api.updateTask(t._id, { status: 'completed' }).catch(() => {});
                  addToast && addToast(`Completed: ${t.title}`);
                }} />
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  {t.priority === 'high' && <Chip tone="danger" dot>High</Chip>}
                  {t.priority === 'med'  && <Chip>Med</Chip>}
                  <span className={`due ${t.dueState}`}>{t.due}</span>
                  <Avatar id={t.owner} size="sm" />
                </div>
              </div>
            ))
          )}
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
              action: 'Log activity',
              onClick: () => openQuickAdd && openQuickAdd('activity'),
            },
            {
              tone: 'accent', label: 'Opportunity',
              text: openDeals.length > 1
                ? <><strong>{openDeals[1].name}</strong> — {fmtMoney(openDeals[1].amount)} at {openDeals[1].prob}% probability. High intent signal.</>
                : <>Check pipeline for upsell opportunities.</>,
              action: 'New task',
              onClick: () => openQuickAdd && openQuickAdd('task'),
            },
            {
              tone: 'warn', label: 'Pipeline',
              text: closedDeals.length > 0
                ? <>{closedDeals.length} deal{closedDeals.length > 1 ? 's' : ''} closed worth <strong>{fmtMoney(wonTotal)}</strong>. Track next milestones.</>
                : <>{openDeals.length} open deals worth <strong>{fmtMoney(totalPipe)}</strong> need attention.</>,
              action: 'View pipeline',
              onClick: () => setView && setView('pipeline'),
            },
          ].map((n, i) => (
            <div key={i} style={{ background: 'var(--bg-elev)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Chip tone={n.tone}>{n.label}</Chip>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink)', flex: 1 }}>{n.text}</div>
              <div>
                <button className="btn sm" onClick={n.onClick}>
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
            <div className="card-title">Open deals</div>
            <span className="card-sub">top {topOpenDeals.length} by amount</span>
            <div className="actions">
              <button className="btn ghost sm" onClick={() => openQuickAdd && openQuickAdd('deal')}><Icon name="plus" size={13} />New deal</button>
            </div>
          </div>
          <div className="card-body flush">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading deals…</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Deal</th><th>Stage</th>
                    <th className="num">Amount</th>
                    <th className="num">Prob</th>
                    <th className="num">Close</th>
                  </tr>
                </thead>
                <tbody>
                  {topOpenDeals.map(d => {
                    const st = STAGES.find(s => s.id === d.stage) || STAGES[0];
                    const probColor = d.prob >= 75 ? 'var(--success)' : d.prob >= 40 ? 'var(--accent)' : 'var(--ink-3)';
                    return (
                      <tr key={d.id} onClick={() => openDetail({ kind: 'deal', data: d })}>
                        <td>
                          <div className="cell-stack"><div>
                            <div className="cell-name">{d.name}</div>
                            <div className="cell-sub">{d.company || '—'} · {d.id}</div>
                          </div></div>
                        </td>
                        <td>
                          <span className="chip" style={{ background: 'transparent' }}>
                            <span className="dot" style={{ background: st.color }}></span>{st.name}
                          </span>
                        </td>
                        <td className="num"><strong>{fmtMoney(d.amount)}</strong></td>
                        <td className="num mono" style={{ color: probColor, fontSize: 11.5 }}>{d.prob}%</td>
                        <td className="num mono muted">{d.close}</td>
                      </tr>
                    );
                  })}
                  {topOpenDeals.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 24, fontSize: 12 }}>
                        No open deals —{' '}
                        <button className="btn primary sm" style={{ marginLeft: 6 }} onClick={() => openQuickAdd && openQuickAdd('deal')}>
                          <Icon name="plus" size={13} />Add first deal
                        </button>
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
