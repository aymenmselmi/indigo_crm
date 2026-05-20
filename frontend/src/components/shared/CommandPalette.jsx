import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '../UI/Icon';

export const CommandPalette = ({ onClose, setView, openQuickAdd }) => {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const items = useMemo(() => {
    const navs = [
      { kind: 'Navigation', label: 'Go to Dashboard', icon: 'home', desc: 'G then D', action: () => setView('dashboard') },
      { kind: 'Navigation', label: 'Go to Accounts', icon: 'company', desc: 'G then A', action: () => setView('accounts') },
      { kind: 'Navigation', label: 'Go to Pipeline', icon: 'pipeline', desc: 'G then P', action: () => setView('pipeline') },
      { kind: 'Navigation', label: 'Go to My tasks', icon: 'check-list', desc: 'G then T', action: () => setView('mytasks') },
      { kind: 'Action', label: 'New deal', icon: 'plus', desc: 'C', action: () => openQuickAdd() },
      { kind: 'Action', label: 'New contact', icon: 'user', desc: '', action: () => openQuickAdd() },
      { kind: 'Action', label: 'New task', icon: 'task', desc: 'T', action: () => openQuickAdd() },
      { kind: 'AI', label: 'Ask: who needs follow-up today?', icon: 'ai', desc: 'Indigo AI', action: () => {} },
      { kind: 'AI', label: 'Ask: forecast for Q2 close', icon: 'ai', desc: 'Indigo AI', action: () => {} },
    ];
    const all = [...navs];
    if (!q) return all;
    return all.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  const grouped = items.reduce((acc, i) => {
    (acc[i.kind] = acc[i.kind] || []).push(i);
    return acc;
  }, {});

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') { items[active]?.action(); onClose(); }
    if (e.key === 'Escape') onClose();
  };

  let cursor = -1;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <input ref={inputRef} className="cmdk-input" placeholder="Search records, run commands, ask AI…" value={q} onChange={e => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey} />
        <div className="cmdk-list">
          {Object.keys(grouped).map(kind => (
            <div key={kind}>
              <div className="cmdk-section-label">{kind}</div>
              {grouped[kind].map(i => {
                cursor++;
                const idx = cursor;
                return (
                  <div key={i.label} className={`cmdk-item ${idx === active ? 'active' : ''}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => { i.action(); onClose(); }}>
                    <Icon name={i.icon} size={14} />
                    <span>{i.label}</span>
                    {i.desc && <span className="desc">{i.desc}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {items.length === 0 && <div className="empty">No results</div>}
        </div>
      </div>
    </div>
  );
};
