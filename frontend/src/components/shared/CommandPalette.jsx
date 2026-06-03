import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '../UI/Icon';
import { api } from '../../services/api';
import { normalizeAccount, normalizeContact, normalizeOpportunity } from '../../utils/normalize';

const NAV_ITEMS = [
  { kind: 'Navigation', label: 'Go to Dashboard',    icon: 'home',       action: (sv) => sv('dashboard') },
  { kind: 'Navigation', label: 'Go to Accounts',     icon: 'company',    action: (sv) => sv('accounts') },
  { kind: 'Navigation', label: 'Go to Contacts',     icon: 'user',       action: (sv) => sv('contacts') },
  { kind: 'Navigation', label: 'Go to Pipeline',     icon: 'pipeline',   action: (sv) => sv('pipeline') },
  { kind: 'Navigation', label: 'Go to My tasks',     icon: 'check-list', action: (sv) => sv('mytasks') },
  { kind: 'Navigation', label: 'Go to Analytics',    icon: 'trend',      action: (sv) => sv('analytics') },
  { kind: 'Navigation', label: 'Go to Reports',      icon: 'note',       action: (sv) => sv('reports') },
  { kind: 'Action', label: 'New deal',    icon: 'plus', action: (_, oqa) => oqa('deal') },
  { kind: 'Action', label: 'New contact', icon: 'user', action: (_, oqa) => oqa('contact') },
  { kind: 'Action', label: 'New task',    icon: 'task', action: (_, oqa) => oqa('task') },
  { kind: 'Action', label: 'New account', icon: 'company', action: (_, oqa) => oqa('account') },
];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const CommandPalette = ({ onClose, setView, openQuickAdd, openDetail }) => {
  const [q, setQ]           = useState('');
  const [active, setActive] = useState(0);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const debouncedQ = useDebounce(q, 250);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debouncedQ.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    Promise.allSettled([
      api.getAccounts(50).catch(() => ({ items: [] })),
      api.getContacts(50).catch(() => ({ items: [] })),
      api.getOpportunities(50).catch(() => ({ items: [] })),
      api.getLeads(50).catch(() => ({ items: [] })),
    ]).then(([aRes, cRes, oRes, lRes]) => {
      const term = debouncedQ.toLowerCase();
      const unwrap = r => r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : (r.value?.items || r.value?.data || [])) : [];

      const accounts = unwrap(aRes).filter(r => (r.name || '').toLowerCase().includes(term)).slice(0, 4)
        .map(r => ({ kind: 'Account', label: r.name, sub: r.industry || r.type || '', icon: 'company',
          action: () => { setView('accounts'); openDetail?.({ kind: 'account', data: normalizeAccount(r) }); } }));
      const contacts = unwrap(cRes).filter(r => `${r.firstName} ${r.lastName} ${r.email}`.toLowerCase().includes(term)).slice(0, 4)
        .map(r => ({ kind: 'Contact', label: [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email, sub: r.email || '', icon: 'user',
          action: () => { setView('contacts'); openDetail?.({ kind: 'contact', data: normalizeContact(r) }); } }));
      const opps = unwrap(oRes).filter(r => (r.name || '').toLowerCase().includes(term)).slice(0, 4)
        .map(r => ({ kind: 'Deal', label: r.name, sub: r.stage || '', icon: 'trend',
          action: () => { setView('opportunities'); openDetail?.({ kind: 'deal', data: normalizeOpportunity(r) }); } }));
      const leads = unwrap(lRes).filter(r => `${r.firstName} ${r.lastName} ${r.company}`.toLowerCase().includes(term)).slice(0, 3)
        .map(r => ({ kind: 'Lead', label: [r.firstName, r.lastName].filter(Boolean).join(' ') || r.company, sub: r.company || '', icon: 'user',
          action: () => setView('leads') }));

      setResults([...accounts, ...contacts, ...opps, ...leads]);
    }).finally(() => setSearching(false));
  }, [debouncedQ]);

  const staticItems = useMemo(() => {
    if (q.trim().length >= 2) return [];
    const term = q.toLowerCase();
    return term
      ? NAV_ITEMS.filter(i => i.label.toLowerCase().includes(term))
      : NAV_ITEMS;
  }, [q]);

  const allItems = q.trim().length >= 2 ? results : staticItems;

  const grouped = allItems.reduce((acc, i) => {
    (acc[i.kind] = acc[i.kind] || []).push(i);
    return acc;
  }, {});

  const flat = Object.values(grouped).flat();

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter')     { flat[active]?.action(setView, openQuickAdd); onClose(); }
    if (e.key === 'Escape')    onClose();
  };

  let cursor = -1;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Search records, go to page, create…"
          value={q}
          onChange={e => { setQ(e.target.value); setActive(0); }}
          onKeyDown={onKey}
        />
        <div className="cmdk-list">
          {searching && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-4)' }}>Searching…</div>
          )}
          {!searching && Object.keys(grouped).map(kind => (
            <div key={kind}>
              <div className="cmdk-section-label">{kind}</div>
              {grouped[kind].map(i => {
                cursor++;
                const idx = cursor;
                return (
                  <div
                    key={i.label + idx}
                    className={`cmdk-item ${idx === active ? 'active' : ''}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => { i.action(setView, openQuickAdd); onClose(); }}
                  >
                    <Icon name={i.icon} size={14} />
                    <span style={{ flex: 1 }}>{i.label}</span>
                    {i.sub && <span className="desc" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{i.sub}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {!searching && flat.length === 0 && (
            <div className="empty" style={{ padding: '16px 14px' }}>
              {q.length >= 2 ? 'No records found' : 'No results'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
