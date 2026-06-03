import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../components/UI/Icon';
import { api } from '../services/api';

function relTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationItem({ n, onRead }) {
  return (
    <div
      className="feed-item"
      style={{ background: !n.isRead ? 'var(--accent-soft)' : '', cursor: 'pointer' }}
      onClick={() => !n.isRead && onRead(n.id)}
    >
      <div className="feed-icon" style={{ background: !n.isRead ? 'var(--accent)' : 'var(--line)', flexShrink: 0 }}>
        <Icon name="bell" size={12} style={{ color: !n.isRead ? '#fff' : 'var(--ink-4)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="feed-text" style={{ fontWeight: !n.isRead ? 550 : 400 }}>{n.title}</div>
        {n.body && <div className="feed-meta" style={{ marginTop: 1 }}>{n.body}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className="mono muted" style={{ fontSize: 10.5 }}>{relTime(n.createdAt)}</span>
        {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
      </div>
    </div>
  );
}

function TaskItem({ t }) {
  const due = t.dueDate ? new Date(t.dueDate) : null;
  const now = new Date();
  const isOverdue = due && due < now && t.status !== 'completed';
  const isToday = due && due.toDateString() === now.toDateString();

  return (
    <div className="feed-item" style={{ background: isOverdue ? 'oklch(1 0.02 20 / 0.35)' : isToday ? 'var(--accent-soft)' : '' }}>
      <div className="feed-icon" style={{ background: isOverdue ? 'var(--danger)' : isToday ? 'var(--accent)' : 'var(--line)', flexShrink: 0 }}>
        <Icon name="task" size={12} style={{ color: isOverdue || isToday ? '#fff' : 'var(--ink-4)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="feed-text" style={{ fontWeight: 500 }}>{t.title || t.subject || 'Untitled task'}</div>
        {t.description && <div className="feed-meta" style={{ marginTop: 1 }}>{t.description}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {isOverdue && <span style={{ fontSize: 10.5, color: 'var(--danger)', fontWeight: 600 }}>Overdue</span>}
        {isToday && !isOverdue && <span style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 600 }}>Today</span>}
        {due && <span className="mono muted" style={{ fontSize: 10.5 }}>{fmtDate(due)}</span>}
      </div>
    </div>
  );
}

export const InboxView = ({ addToast }) => {
  const [notifications, setNotifications] = useState([]);
  const [tasks, setTasks]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState('notifications');

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getNotifications().catch(() => []),
      api.getMyTasks().catch(() => []),
    ]).then(([notifs, rawTasks]) => {
      setNotifications(Array.isArray(notifs) ? notifs : []);
      const now = new Date();
      const urgent = (Array.isArray(rawTasks) ? rawTasks : []).filter(t => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d <= now || d.toDateString() === now.toDateString();
      });
      setTasks(urgent);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const markRead = async (id) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
    await api.markNotificationRead(id).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
    await api.markAllRead().catch(() => {});
    addToast && addToast('All notifications marked as read');
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="page-inner" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Inbox</div>
          <div className="page-sub">
            {unread > 0 ? <><span style={{ color: 'var(--accent)' }}>{unread} unread</span> · </> : ''}
            <span className="mono">{notifications.length} notifications</span>
            {tasks.length > 0 && <> · <span style={{ color: 'var(--warn)' }}>{tasks.length} urgent task{tasks.length !== 1 ? 's' : ''}</span></>}
          </div>
        </div>
        <div className="actions">
          {unread > 0 && (
            <button className="btn sm" onClick={markAllRead}>Mark all read</button>
          )}
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 12 }}>
        <button
          className={`filter-pill ${tab === 'notifications' ? 'active' : ''}`}
          onClick={() => setTab('notifications')}
        >
          <Icon name="bell" size={11} />
          Notifications
          {unread > 0 && <span style={{ marginLeft: 4, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 600 }}>{unread}</span>}
        </button>
        <button
          className={`filter-pill ${tab === 'tasks' ? 'active' : ''}`}
          onClick={() => setTab('tasks')}
        >
          <Icon name="task" size={11} />
          Urgent tasks
          {tasks.length > 0 && <span style={{ marginLeft: 4, background: 'var(--warn)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 600 }}>{tasks.length}</span>}
        </button>
      </div>

      <div className="card">
        <div className="card-body flush feed">
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
          ) : tab === 'notifications' ? (
            notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
                No notifications yet
              </div>
            ) : notifications.map(n => (
              <NotificationItem key={n.id} n={n} onRead={markRead} />
            ))
          ) : (
            tasks.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                No overdue or due-today tasks
              </div>
            ) : tasks.map(t => (
              <TaskItem key={t.id} t={t} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
