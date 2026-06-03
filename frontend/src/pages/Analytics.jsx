import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../components/UI/Icon';
import { api, unwrap } from '../services/api';

const STAGE_ORDER  = ['prospecting','qualification','proposal','negotiation','closed-won','closed-lost'];
const STAGE_LABELS = { prospecting:'Prospecting', qualification:'Qualification', proposal:'Proposal', negotiation:'Negotiation', 'closed-won':'Closed-Won', 'closed-lost':'Closed-Lost' };

const PERIODS = [
  { id:'30d', label:'Last 30d' },
  { id:'90d', label:'Last 90d' },
  { id:'q1',  label:'Q1' },
  { id:'q2',  label:'Q2' },
  { id:'q3',  label:'Q3' },
  { id:'q4',  label:'Q4' },
  { id:'all', label:'All time' },
];

function getPeriodStart(period) {
  const y = new Date().getFullYear();
  if (period === '30d') return new Date(Date.now() - 30 * 864e5);
  if (period === '90d') return new Date(Date.now() - 90 * 864e5);
  if (period === 'q1')  return new Date(y, 0, 1);
  if (period === 'q2')  return new Date(y, 3, 1);
  if (period === 'q3')  return new Date(y, 6, 1);
  if (period === 'q4')  return new Date(y, 9, 1);
  return new Date(0);
}

function fmtMoney(n) {
  if (!n && n !== 0) return '$0';
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}

function avatarColor(str='') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `oklch(0.58 0.14 ${Math.abs(h) % 360})`;
}

function initials(m) {
  return ((m.firstName?.[0] || '') + (m.lastName?.[0] || '')).toUpperCase() || (m.email?.[0] || '?').toUpperCase();
}

function isoWeek(date) {
  const d  = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return Math.round(((d - jan4) / 864e5 + (jan4.getDay() + 6) % 7) / 7) + 1;
}

function downloadCSV(filename, rows, headers) {
  const esc  = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const blob = new Blob([[headers,...rows].map(r => r.map(esc).join(',')).join('\n')], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href:url, download:filename }).click();
  URL.revokeObjectURL(url);
}

// ── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, up, neutral }) {
  return (
    <div className="kpi" style={{ cursor:'default' }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize:30, marginTop:4 }}>{value}</div>
      {delta && (
        <div className="kpi-foot" style={{ marginTop:6 }}>
          <span className={`kpi-delta ${neutral ? 'flat' : up ? 'up' : 'down'}`}>
            {!neutral && (up ? '↑ ' : '↓ ')}{delta}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Funnel bar ───────────────────────────────────────────────────────────────
function FunnelBar({ name, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, marginBottom:6 }}>
        <span style={{ color:'var(--ink-2)' }}>{name}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--ink-3)' }}>
          <strong style={{ color:'var(--ink)', fontWeight:600 }}>{value}</strong>
          {'  ·  '}{max > 0 ? Math.round(value / max * 100) : 0}%
        </span>
      </div>
      <div style={{ height:14, background:'var(--bg-sunken)', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4, transition:'width 600ms ease' }} />
      </div>
    </div>
  );
}

// ── Leaderboard row ──────────────────────────────────────────────────────────
function LeaderRow({ rank, member, revenue, maxRevenue }) {
  const pct = maxRevenue > 0 ? Math.min((revenue / maxRevenue) * 100, 100) : 0;
  const bg  = avatarColor(member.id || member.email || '');
  const name= [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Unknown';
  const role= member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Member';

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--line)' }}>
      <span style={{ width:16, textAlign:'center', fontSize:12, color:'var(--ink-4)', fontFamily:'var(--font-mono)', flexShrink:0 }}>{rank}</span>
      <div style={{ width:36, height:36, borderRadius:'50%', background:bg, display:'grid', placeItems:'center', color:'white', fontSize:12, fontWeight:700, flexShrink:0, letterSpacing:'-0.02em' }}>
        {initials(member)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
        <div style={{ fontSize:11, color:'var(--ink-4)', fontFamily:'var(--font-mono)', marginTop:1 }}>{role}</div>
        <div style={{ marginTop:6, height:4, background:'var(--bg-sunken)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'var(--accent)', borderRadius:2, transition:'width 600ms ease' }} />
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0, minWidth:70 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--accent-ink)', fontFamily:'var(--font-mono)' }}>{fmtMoney(revenue)}</div>
        <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:2 }}>{Math.round(pct)}%</div>
      </div>
    </div>
  );
}

// ── Weekly column chart ───────────────────────────────────────────────────────
function WeeklyChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  if (data.every(d => d.value === 0)) {
    return <div style={{ textAlign:'center', padding:'40px 0', color:'var(--ink-4)', fontSize:12 }}>No closed revenue in this period</div>;
  }
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:140, paddingBottom:24, position:'relative' }}>
      {/* Y-axis hint */}
      <div style={{ position:'absolute', top:0, left:0, right:0, borderTop:'1px dashed var(--line)', display:'flex', justifyContent:'flex-end', paddingRight:4 }}>
        <span style={{ fontSize:10, color:'var(--ink-4)', fontFamily:'var(--font-mono)', transform:'translateY(-10px)', background:'var(--bg-elev)', padding:'0 2px' }}>{fmtMoney(max)}</span>
      </div>
      {data.map(({ week, value }) => {
        const h = max > 0 ? (value / max) * 100 : 0;
        return (
          <div key={week} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%' }} title={`${week}: ${fmtMoney(value)}`}>
            <div style={{
              width:'100%', maxWidth:48,
              height:`${h}%`, minHeight: value > 0 ? 4 : 0,
              background: value > 0 ? 'var(--accent)' : 'var(--bg-sunken)',
              borderRadius:'4px 4px 0 0',
              transition:'height 600ms ease',
              opacity: value > 0 ? 1 : 0.4,
            }} />
            <div style={{ fontSize:10, color:'var(--ink-4)', fontFamily:'var(--font-mono)', marginTop:6, whiteSpace:'nowrap' }}>{week}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
export const AnalyticsView = () => {
  const [opps,    setOpps]    = useState([]);
  const [leads,   setLeads]   = useState([]);
  const [acts,    setActs]    = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState('90d');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.getOpportunities(500),
      api.getLeads(500),
      api.getActivities(500),
      api.listMembers(),
    ]).then(([oRes, lRes, aRes, mRes]) => {
      if (oRes.status === 'fulfilled') setOpps(unwrap(oRes.value));
      if (lRes.status === 'fulfilled') setLeads(unwrap(lRes.value));
      if (aRes.status === 'fulfilled') setActs(unwrap(aRes.value));
      if (mRes.status === 'fulfilled') setMembers(Array.isArray(mRes.value) ? mRes.value : []);
    }).finally(() => setLoading(false));
  }, []);

  const periodStart = useMemo(() => getPeriodStart(period), [period]);
  const periodLabel = PERIODS.find(p => p.id === period)?.label || period;
  const currentYear = new Date().getFullYear();
  const periodDisplay = period.startsWith('q') ? `${periodLabel.toUpperCase()} ${currentYear}` : periodLabel;

  // Filter
  const fOpps  = useMemo(() => opps.filter(o  => new Date(o.createdAt)  >= periodStart), [opps,  periodStart]);
  const fLeads = useMemo(() => leads.filter(l  => new Date(l.createdAt) >= periodStart), [leads, periodStart]);

  // KPIs
  const wonOpps    = fOpps.filter(o => o.stage === 'closed-won');
  const openOpps   = fOpps.filter(o => o.stage !== 'closed-won' && o.stage !== 'closed-lost');
  const closedOpps = fOpps.filter(o => o.stage === 'closed-won' || o.stage === 'closed-lost');
  const totalWon   = wonOpps.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const totalPipe  = openOpps.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const winRate    = closedOpps.length ? `${((wonOpps.length / closedOpps.length) * 100).toFixed(0)}%` : '—';
  const convRate   = fLeads.length ? `${((fLeads.filter(l => l.status === 'converted').length / fLeads.length) * 100).toFixed(1)}%` : '—';

  // Avg sales cycle
  const avgCycle = useMemo(() => {
    const durations = wonOpps.filter(o => o.createdAt && o.updatedAt)
      .map(o => (new Date(o.updatedAt) - new Date(o.createdAt)) / 864e5)
      .filter(d => d > 0);
    return durations.length ? `${Math.round(durations.reduce((s,d) => s+d,0) / durations.length)}d` : '—';
  }, [wonOpps]);

  // Pipeline coverage = open pipeline / closed won
  const coverage = totalWon > 0 ? `${(totalPipe / totalWon).toFixed(1)}×` : '—';

  // Funnel
  const qualifiedLeads = fLeads.filter(l => l.status === 'qualified' || l.status === 'converted').length;
  const funnelData = [
    { name:'Leads created', v:fLeads.length,                                              color:'oklch(0.68 0.14 258)' },
    { name:'Qualified',     v:qualifiedLeads,                                              color:'oklch(0.63 0.14 240)' },
    { name:'Proposal sent', v:fOpps.filter(o => o.stage === 'proposal').length,           color:'oklch(0.58 0.15 222)' },
    { name:'Negotiation',   v:fOpps.filter(o => o.stage === 'negotiation').length,        color:'oklch(0.60 0.14 175)' },
    { name:'Closed-Won',    v:wonOpps.length,                                              color:'var(--success)'       },
  ];
  const funnelMax = funnelData[0].v || 1;

  // Team leaderboard
  const leaderboard = useMemo(() => {
    const rev = {};
    wonOpps.forEach(o => { if (o.ownerId) rev[o.ownerId] = (rev[o.ownerId] || 0) + (Number(o.amount) || 0); });
    // Include all members, even those with 0 revenue
    return members
      .map(m => ({ member:m, revenue: rev[m.id] || 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [wonOpps, members]);
  const maxRevenue = leaderboard[0]?.revenue || 1;

  // Weekly revenue chart (last 12 weeks of won deals)
  const weeklyData = useMemo(() => {
    const weeks = [];
    const now   = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now - i * 7 * 864e5);
      weeks.push({ week: `W${isoWeek(d)}`, start: new Date(d - 3.5 * 864e5), end: new Date(d + 3.5 * 864e5), value: 0 });
    }
    wonOpps.forEach(o => {
      const d = new Date(o.updatedAt || o.createdAt);
      const w = weeks.find(wk => d >= wk.start && d < wk.end);
      if (w) w.value += Number(o.amount) || 0;
    });
    return weeks.map(({ week, value }) => ({ week, value }));
  }, [wonOpps]);

  const exportAll = () => {
    const pipelineByStage = STAGE_ORDER.map(stage => {
      const rows = fOpps.filter(o => o.stage === stage);
      return { label: STAGE_LABELS[stage], count: rows.length, amount: rows.reduce((s,o) => s + (Number(o.amount)||0), 0) };
    }).filter(r => r.count > 0);
    downloadCSV('pipeline.csv',  pipelineByStage.map(r => [r.label, r.count, r.amount]),                ['Stage','Deals','Amount']);
    downloadCSV('leads.csv',     fLeads.map(l => [l.firstName, l.lastName, l.status, l.company || '']), ['First','Last','Status','Company']);
    downloadCSV('leaderboard.csv', leaderboard.map(r => [[r.member.firstName, r.member.lastName].filter(Boolean).join(' ') || r.member.email, r.revenue]), ['Name','Revenue']);
  };

  return (
    <div className="page-inner" style={{ maxWidth:1200 }}>

      {/* Header */}
      <div className="page-head">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-sub">{periodDisplay} · revenue, velocity, conversion</div>
        </div>
        <div className="actions">
          {/* Period picker */}
          <div style={{ position:'relative' }}>
            <button className="btn sm" onClick={() => setShowPeriodMenu(s => !s)}>
              <Icon name="cal" size={12} />{periodDisplay} <span style={{ marginLeft:2, opacity:0.5 }}>▾</span>
            </button>
            {showPeriodMenu && (
              <div
                style={{ position:'absolute', right:0, top:'100%', marginTop:4, zIndex:30, background:'var(--bg-elev)', border:'1px solid var(--line)', borderRadius:8, boxShadow:'var(--shadow-pop)', padding:'4px 0', minWidth:140 }}
                onMouseLeave={() => setShowPeriodMenu(false)}
              >
                {PERIODS.map(p => (
                  <button key={p.id}
                    style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 14px', background: period === p.id ? 'var(--bg-sunken)' : 'none', border:'none', cursor:'pointer', fontSize:12.5, fontFamily:'var(--font)', color: period === p.id ? 'var(--accent-ink)' : 'var(--ink)', fontWeight: period === p.id ? 600 : 400 }}
                    onClick={() => { setPeriod(p.id); setShowPeriodMenu(false); }}>
                    {p.id.startsWith('q') ? `${p.label} ${currentYear}` : p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn sm" disabled={loading} onClick={exportAll}>
            <Icon name="more" size={12} />Export
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(4, 1fr)', marginBottom:20 }}>
        <KpiCard label={`Bookings (${periodDisplay})`} value={loading ? '…' : fmtMoney(totalWon)}  delta={`${wonOpps.length} deals won`} neutral />
        <KpiCard label="Avg sales cycle"               value={loading ? '…' : avgCycle}             delta={wonOpps.length ? 'closed deals' : 'no data'} neutral />
        <KpiCard label="Pipeline coverage"             value={loading ? '…' : coverage}             delta={`vs ${fmtMoney(totalPipe)} open`} neutral />
        <KpiCard label="Conversion (L→W)"              value={loading ? '…' : convRate}             delta={`${fLeads.length} total leads`} neutral />
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:'center', color:'var(--ink-4)', fontSize:13 }}>Loading…</div>
      ) : (
        <>
          {/* Funnel + Leaderboard */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16, marginBottom:16, alignItems:'start' }}>

            {/* Funnel */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Funnel · Lead → Won</div>
                <span className="card-sub">{periodDisplay}</span>
              </div>
              <div className="card-body" style={{ paddingTop:20 }}>
                {fLeads.length === 0 && fOpps.length === 0 ? (
                  <div style={{ color:'var(--ink-4)', fontSize:12, textAlign:'center', padding:'32px 0' }}>
                    No data for this period — add leads and opportunities to see the funnel.
                  </div>
                ) : funnelData.map(s => (
                  <FunnelBar key={s.name} name={s.name} value={s.v} max={funnelMax} color={s.color} />
                ))}
              </div>
            </div>

            {/* Team leaderboard */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Team leaderboard</div>
                <span className="card-sub">{periodDisplay}</span>
              </div>
              <div className="card-body" style={{ paddingTop:4 }}>
                {members.length === 0 ? (
                  <div style={{ color:'var(--ink-4)', fontSize:12, textAlign:'center', padding:'32px 0' }}>No team members</div>
                ) : leaderboard.every(r => r.revenue === 0) ? (
                  <div style={{ color:'var(--ink-4)', fontSize:12, textAlign:'center', padding:'32px 0' }}>No closed revenue in this period</div>
                ) : leaderboard.filter(r => r.revenue > 0).map((r, i) => (
                  <LeaderRow key={r.member.id} rank={i+1} member={r.member} revenue={r.revenue} maxRevenue={maxRevenue} />
                ))}
              </div>
            </div>
          </div>

          {/* Revenue by week chart */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Revenue by week</div>
              <span className="card-sub">Closed-won · last 12 weeks</span>
              <span style={{ marginLeft:'auto', fontSize:12, color:'var(--ink-4)', fontFamily:'var(--font-mono)' }}>
                Total {fmtMoney(totalWon)}
              </span>
            </div>
            <div className="card-body">
              <WeeklyChart data={weeklyData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
