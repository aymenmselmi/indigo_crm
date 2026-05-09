// Maps backend entity shapes → new frontend UI shapes

const STAGE_MAP = {
  prospecting: 'lead',
  qualification: 'qualify',
  proposal: 'propose',
  negotiation: 'negotiate',
  'closed-won': 'close',
  'closed-lost': 'close',
};

function ageDays(dateStr) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr)) / 864e5));
}

function relativeTime(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  const d = Math.floor(mins / 1440);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Stable 2-char display ID derived from a UUID for Avatar color generation
function shortId(uuid) {
  const s = String(uuid || '');
  // Take chars at fixed positions for visual consistency
  return (s[0] + s[s.length - 1]).toUpperCase();
}

export function normalizeOpportunity(opp) {
  const cd = opp.expectedCloseDate ? new Date(opp.expectedCloseDate) : null;
  const closeStr =
    opp.stage === 'closed-won'  ? 'Closed'
    : opp.stage === 'closed-lost' ? 'Lost'
    : cd ? cd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'TBD';

  return {
    id:          opp.id.slice(0, 7).toUpperCase(),
    _id:         opp.id,
    name:        opp.name,
    company:     opp.account?.name || '—',
    amount:      Number(opp.amount) || 0,
    stage:       STAGE_MAP[opp.stage] || 'lead',
    owner:       shortId(opp.id),
    prob:        Number(opp.probability) || 0,
    close:       closeStr,
    age:         ageDays(opp.createdAt),
    tags:        [],
    health:      'good',
    // raw fields preserved for edit modal
    _rawStage:   opp.stage || 'prospecting',
    _accountId:  opp.account?.id || '',
    _closeDate:  opp.expectedCloseDate ? opp.expectedCloseDate.slice(0, 10) : '',
    description: opp.description || '',
  };
}

export function normalizeAccount(acc) {
  const tierMap = { customer: 'Strategic', partner: 'Mid', prospect: 'SMB', competitor: 'SMB' };
  return {
    id: acc.id.slice(0, 7).toUpperCase(),
    _id: acc.id,
    name: acc.name,
    industry: acc.industry || '—',
    size: acc.employees ? `${acc.employees}` : '—',
    owner: shortId(acc.id),
    tier: tierMap[acc.type] || 'SMB',
    mrr: Math.round(Number(acc.annualRevenue || 0) / 12),
    health: 'good',
    tags: acc.type ? [acc.type] : ['prospect'],
    domain: acc.website
      ? acc.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
      : '',
  };
}

export function normalizeContact(c) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unknown';
  const diffDays = ageDays(c.updatedAt);
  const last =
    diffDays === 0 ? 'today'
    : diffDays === 1 ? '1d ago'
    : diffDays < 7 ? `${diffDays}d ago`
    : `${Math.floor(diffDays / 7)}w ago`;

  return {
    id:          c.id.slice(0, 7).toUpperCase(),
    _id:         c.id,
    name,
    firstName:   c.firstName || '',
    lastName:    c.lastName  || '',
    title:       c.title || '',
    department:  c.department || '',
    mobilePhone: c.mobilePhone || '',
    address:     c.address || '',
    account:     c.account?.name || '',
    _accountId:  c.account?.id || c.accountId || '',
    email:       c.email || '',
    phone:       c.phone || '',
    status:      c.status || 'active',
    last,
    owner:       shortId(c.id),
  };
}

export function normalizeActivity(act) {
  const ICON_MAP = { email: 'accent', call: 'default', meeting: 'accent', task: 'default', note: 'default' };
  return {
    id: act.id,
    kind: act.type,
    icon: ICON_MAP[act.type] || 'default',
    text: `<strong>${escapeHtml(act.subject)}</strong>`,
    meta: `${act.type} · ${relativeTime(act.createdAt)}`,
  };
}

export function normalizeLead(lead) {
  return {
    id:             lead.id.slice(0, 7).toUpperCase(),
    _id:            lead.id,
    name:           [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown',
    firstName:      lead.firstName || '',
    lastName:       lead.lastName  || '',
    email:          lead.email     || '',
    phone:          lead.phone     || '',
    company:        lead.company   || '',
    title:          lead.title     || '',
    status:         lead.status    || 'new',
    source:         lead.source    || 'cold',
    notes:          lead.notes     || '',
    estimatedValue: Number(lead.estimatedValue) || 0,
    leadScore:      Number(lead.leadScore)      || 0,
    age:            ageDays(lead.createdAt),
    createdAt:      lead.createdAt,
  };
}

const PRIORITY_MAP = { high: 'high', urgent: 'high', medium: 'med', low: 'low' };

export function normalizeTask(task) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const diffDays = due ? Math.floor((due - Date.now()) / 864e5) : null;

  let dueState = 'normal';
  let dueStr = due
    ? due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'No due date';

  if (due) {
    if (diffDays < 0) { dueState = 'overdue'; dueStr = `${Math.abs(diffDays)}d overdue`; }
    else if (diffDays === 0) { dueState = 'today'; dueStr = 'Today'; }
    else if (diffDays === 1) dueStr = 'Tomorrow';
  }

  return {
    id: task.id.slice(0, 7).toUpperCase(),
    _id: task.id,
    title: task.title || task.subject || 'Untitled',
    due: dueStr,
    dueState,
    owner: shortId(task.id),
    linked: task.relatedOpportunityId
      ? task.relatedOpportunityId.slice(0, 7).toUpperCase()
      : task.relatedContactId
      ? task.relatedContactId.slice(0, 7).toUpperCase()
      : '—',
    priority: PRIORITY_MAP[task.priority] || 'med',
    done: task.status === 'completed',
  };
}
