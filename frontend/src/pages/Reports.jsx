import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { api, unwrap } from '../services/api';

const STAGE_ORDER  = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];
const STAGE_LABELS = { prospecting: 'Prospecting', qualification: 'Qualification', proposal: 'Proposal', negotiation: 'Negotiation', 'closed-won': 'Closed-Won', 'closed-lost': 'Closed-Lost' };
const STAGE_COLORS = { prospecting: 'var(--st-1)', qualification: 'var(--st-2)', proposal: 'var(--st-3)', negotiation: 'var(--st-4)', 'closed-won': 'var(--success)', 'closed-lost': 'var(--ink-4)' };
const ACT_TYPES    = ['call', 'email', 'meeting', 'note', 'task'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'rejected'];

function fmtMoney(n) {
  if (!n) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

function downloadCSV(filename, rows, headers) {
  const esc  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([[headers, ...rows].map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

function SummaryTable({ title, sub, headers, rows, onExport, emptyMsg }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
        {sub && <span className="card-sub">{sub}</span>}
        {onExport && (
          <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={onExport}>
            <Icon name="more" size={12} /> Export
          </button>
        )}
      </div>
      <div className="card-body flush">
        <table className="table">
          <thead>
            <tr>{headers.map(h => <th key={h.label} className={h.num ? 'num' : ''}>{h.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-4)', fontSize: 12 }}>{emptyMsg || 'No data yet'}</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className={headers[j]?.num ? 'num mono muted' : ''} style={headers[j]?.style}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const ReportsView = () => {
  const [opps, setOpps]       = useState([]);
  const [leads, setLeads]     = useState([]);
  const [acts, setActs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getOpportunities(500),
      api.getLeads(500),
      api.getActivities(500),
    ]).then(([oRes, lRes, aRes]) => {
      if (oRes.status === 'fulfilled') setOpps(unwrap(oRes.value));
      if (lRes.status === 'fulfilled') setLeads(unwrap(lRes.value));
      if (aRes.status === 'fulfilled') setActs(unwrap(aRes.value));
    }).finally(() => setLoading(false));
  }, []);

  // Pipeline by stage
  const pipelineByStage = STAGE_ORDER.map(stage => {
    const rows = opps.filter(o => o.stage === stage);
    return { stage, label: STAGE_LABELS[stage], count: rows.length, amount: rows.reduce((s, o) => s + (Number(o.amount) || 0), 0) };
  }).filter(r => r.count > 0);
  const pipeTotal = pipelineByStage.reduce((s, r) => s + r.amount, 0);

  // Leads by status
  const leadsByStatus = LEAD_STATUSES.map(status => ({
    status, count: leads.filter(l => (l.status || 'new') === status).length,
  })).filter(r => r.count > 0);

  // Activities by type
  const actsByType = ACT_TYPES.map(t => {
    const rows = acts.filter(a => a.type === t);
    const done = rows.filter(a => a.status === 'completed' || a.completed).length;
    return { type: t, count: rows.length, done, pending: rows.length - done };
  }).filter(r => r.count > 0);

  const exportAll = () => {
    downloadCSV('pipeline.csv',   pipelineByStage.map(r => [r.label, r.count, r.amount, r.count > 0 ? Math.round(r.amount / r.count) : 0]), ['Stage', 'Deals', 'Total Value', 'Avg Deal Size']);
    downloadCSV('leads.csv',      leadsByStatus.map(r => [r.status, r.count]), ['Status', 'Count']);
    downloadCSV('activities.csv', actsByType.map(r => [r.type, r.count, r.done, r.pending]), ['Type', 'Total', 'Done', 'Pending']);
  };

  return (
    <div className="page-inner" style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-sub">Tabular data · export to CSV</div>
        </div>
        <div className="actions">
          <button className="btn sm" disabled={loading} onClick={exportAll}>
            <Icon name="more" size={12} />Export all
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <SummaryTable
            title="Pipeline by stage"
            sub={`${opps.length} total deals`}
            onExport={() => downloadCSV('pipeline.csv', pipelineByStage.map(r => [r.label, r.count, r.amount, r.count > 0 ? Math.round(r.amount / r.count) : 0, pipeTotal > 0 ? `${((r.amount / pipeTotal) * 100).toFixed(1)}%` : '—']), ['Stage', 'Deals', 'Total Value', 'Avg Deal Size', 'Share'])}
            headers={[
              { label: 'Stage' },
              { label: 'Deals', num: true },
              { label: 'Total value', num: true },
              { label: 'Avg deal size', num: true },
              { label: 'Share', num: true },
            ]}
            rows={pipelineByStage.map(r => [
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[r.stage] || 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                {r.label}
              </span>,
              r.count,
              fmtMoney(r.amount),
              r.count > 0 ? fmtMoney(Math.round(r.amount / r.count)) : '—',
              pipeTotal > 0 ? `${((r.amount / pipeTotal) * 100).toFixed(1)}%` : '—',
            ])}
            emptyMsg="No deals yet"
          />

          <SummaryTable
            title="Leads by status"
            sub={`${leads.length} total leads`}
            onExport={() => downloadCSV('leads.csv', leadsByStatus.map(r => [r.status, r.count, leads.length > 0 ? `${((r.count / leads.length) * 100).toFixed(1)}%` : '—']), ['Status', 'Count', 'Share'])}
            headers={[
              { label: 'Status' },
              { label: 'Count', num: true },
              { label: 'Share', num: true },
            ]}
            rows={leadsByStatus.map(r => [
              <span style={{ textTransform: 'capitalize' }}>{r.status}</span>,
              r.count,
              leads.length > 0 ? `${((r.count / leads.length) * 100).toFixed(1)}%` : '—',
            ])}
            emptyMsg="No leads yet"
          />

          <SummaryTable
            title="Activities by type"
            sub={`${acts.length} total activities`}
            onExport={() => downloadCSV('activities.csv', actsByType.map(r => [r.type, r.count, r.done, r.pending, r.count > 0 ? `${((r.done / r.count) * 100).toFixed(1)}%` : '—']), ['Type', 'Total', 'Done', 'Pending', 'Completion Rate'])}
            headers={[
              { label: 'Type' },
              { label: 'Total', num: true },
              { label: 'Done', num: true },
              { label: 'Pending', num: true },
              { label: 'Completion', num: true },
            ]}
            rows={actsByType.map(r => [
              <span style={{ textTransform: 'capitalize' }}>{r.type}</span>,
              r.count,
              r.done,
              r.pending,
              r.count > 0 ? `${((r.done / r.count) * 100).toFixed(1)}%` : '—',
            ])}
            emptyMsg="No activities yet"
          />

        </div>
      )}
    </div>
  );
};
