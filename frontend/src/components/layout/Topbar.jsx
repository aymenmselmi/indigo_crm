import { useState, useEffect, useRef } from 'react';
import { Icon } from '../UI/Icon';
import { KbdInline } from '../UI/Primitives';
import { api } from '../../services/api';

function relTime(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON = {
  task_assigned:   'task',
  activity_logged: 'cal',
  deal_updated:    'note',
};

function NotificationDropdown({ notifications, onMarkRead, onMarkAll, onClose }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 340, background: 'var(--bg-elev)', border: '1px solid var(--line)',
      borderRadius: 10, boxShadow: 'var(--shadow-2)', zIndex: 999,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Notifications</span>
        {notifications.some(n => !n.read) && (
          <button
            className="btn ghost sm"
            style={{ fontSize: 11 }}
            onClick={onMarkAll}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
            You're all caught up
          </div>
        ) : notifications.map(n => (
          <div
            key={n.id}
            onClick={() => onMarkRead(n.id)}
            style={{
              display: 'flex', gap: 10, padding: '10px 16px', cursor: 'pointer',
              background: n.read ? 'transparent' : 'color-mix(in oklch, var(--accent) 6%, transparent)',
              borderBottom: '1px solid var(--line)',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunken)'}
            onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'color-mix(in oklch, var(--accent) 6%, transparent)'}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: n.read ? 'var(--bg-sunken)' : 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: n.read ? 'var(--ink-3)' : 'var(--accent)',
            }}>
              <Icon name={TYPE_ICON[n.type] || 'bell'} size={13} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: n.read ? 400 : 600, color: 'var(--ink)', lineHeight: 1.3 }}>
                {n.title}
              </div>
              {n.body && (
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.body}
                </div>
              )}
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 3 }}>{relTime(n.createdAt)}</div>
            </div>
            {!n.read && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const Topbar = ({ view, openQuickAdd, openCmd, toggleSidebar }) => {
  const titles = {
    dashboard:  ['Workspace', 'Dashboard'],
    accounts:   ['Records',   'Accounts'],
    contacts:   ['Records',   'Contacts'],
    leads:      ['Records',   'Leads'],
    pipeline:   ['Records',   'Pipeline'],
    activities: ['Records',   'Activities'],
    inbox:      ['Workflow',  'Inbox'],
    mytasks:    ['Workflow',  'My tasks'],
    analytics:  ['Workflow',  'Analytics'],
    reports:    ['Workflow',  'Reports'],
  };
  const [section, page] = titles[view] || ['', view];

  const [showNotif, setShowNotif]           = useState(false);
  const [notifications, setNotifications]   = useState([]);
  const [unread, setUnread]                 = useState(0);

  const loadNotifications = () => {
    api.getNotifications()
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setNotifications(list);
        setUnread(list.filter(n => !n.read).length);
      })
      .catch(() => {});
  };

  // Initial load + poll every 30s
  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    api.markNotificationRead(id).catch(() => {});
  };

  const handleMarkAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    api.markAllRead().catch(() => {});
  };

  return (
    <div className="topbar">
      <button className="btn ghost icon" onClick={toggleSidebar} title="Toggle sidebar">
        <Icon name="panel" size={15} />
      </button>
      <div className="crumbs">
        <span>{section}</span>
        <span className="sep">/</span>
        <span className="here">{page}</span>
      </div>
      <div className="topbar-right">
        <button className="btn ghost sm" onClick={openCmd}>
          <Icon name="search" size={13} /> Search <KbdInline k="⌘K" />
        </button>

        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn ghost icon"
            title="Notifications"
            onClick={() => setShowNotif(v => !v)}
            style={{ position: 'relative' }}
          >
            <Icon name="bell" size={15} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 16, height: 16, borderRadius: 8,
                background: 'var(--danger)', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1, pointerEvents: 'none',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {showNotif && (
            <NotificationDropdown
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAll={handleMarkAll}
              onClose={() => setShowNotif(false)}
            />
          )}
        </div>

        <button className="btn sm" onClick={openQuickAdd}>
          <Icon name="plus" size={13} /> New <KbdInline k="C" />
        </button>
      </div>
    </div>
  );
};
