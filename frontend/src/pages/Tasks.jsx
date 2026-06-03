import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { Avatar, Chip, KbdInline } from '../components/UI/Primitives';
import { api, unwrap } from '../services/api';
import { normalizeTask } from '../utils/normalize';

export const TasksView = ({ openDetail, addToast, openQuickAdd }) => {
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCompleted, setShowCompleted]   = useState(true);

  useEffect(() => {
    api.getMyTasks()
      .then(res => {
        const items = unwrap(res);
        if (items.length > 0) setTasks(items.map(normalizeTask));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    setTasks(tasks.map(x => x.id === id ? { ...x, done: !x.done } : x));
    if (!t.done) addToast(`Completed: ${t.title}`);
    if (t._id) {
      api.updateTask(t._id, { status: t.done ? 'pending' : 'completed' }).catch(() => {});
    }
  };

  const openCount    = tasks.filter(t => !t.done).length;
  const overdueCount = tasks.filter(t => t.dueState === 'overdue' && !t.done).length;

  const byPriority = t => priorityFilter === 'all' || t.priority === priorityFilter || (priorityFilter === 'high' && t.priority === 'high') || (priorityFilter === 'med' && (t.priority === 'med' || t.priority === 'medium')) || (priorityFilter === 'low' && t.priority === 'low');
  const groups = [
    { label: 'Overdue',   list: tasks.filter(t => t.dueState === 'overdue' && !t.done && byPriority(t)) },
    { label: 'Today',     list: tasks.filter(t => t.dueState === 'today'   && !t.done && byPriority(t)) },
    { label: 'Upcoming',  list: tasks.filter(t => t.dueState === 'normal'  && !t.done && byPriority(t)) },
    { label: 'Completed', list: showCompleted ? tasks.filter(t => t.done && byPriority(t)) : [] },
  ];

  return (
    <div className="page-inner" style={{ maxWidth: 920 }}>
      <div className="page-head">
        <div>
          <div className="page-title">My tasks</div>
          <div className="page-sub">
            <span className="mono">{openCount}</span> open
            {overdueCount > 0 && <> · <span style={{ color: 'var(--danger)' }}>{overdueCount} overdue</span></>}
          </div>
        </div>
        <div className="actions">
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            style={{ height: 30, padding: '0 8px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink)', cursor: 'pointer' }}
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="med">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className={`btn sm ${!showCompleted ? 'active' : ''}`} onClick={() => setShowCompleted(v => !v)}>
            <Icon name="filter" size={13} />{showCompleted ? 'Hide completed' : 'Show completed'}
          </button>
          <button className="btn primary sm" onClick={() => openQuickAdd && openQuickAdd('task')}><Icon name="plus" size={13} />New task <KbdInline k="T" /></button>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-body" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
            Loading tasks…
          </div>
        </div>
      )}

      {!loading && groups.map(g => g.list.length > 0 && (
        <div key={g.label} className="card" style={{ marginBottom: 14 }}>
          <div className="card-head">
            <div className="card-title">{g.label}</div>
            <span className="card-sub">{g.list.length}</span>
          </div>
          <div className="card-body flush">
            {g.list.map(t => (
              <div
                key={t.id}
                className={`task-row ${t.done ? 'done' : ''}`}
                onClick={() => openDetail({ kind: 'task', data: t })}
              >
                <div className="task-check" onClick={e => { e.stopPropagation(); toggle(t.id); }}>
                  {t.done && <Icon name="check-sm" size={12} stroke={2.6} />}
                </div>
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  {t.priority === 'high' && <Chip tone="danger" dot>High</Chip>}
                  {t.priority === 'med'  && <Chip>Med</Chip>}
                  {t.priority === 'low'  && <Chip>Low</Chip>}
                  <span className="tag mono" style={{ fontSize: 10 }}>{t.linked}</span>
                  <span className={`due ${t.dueState}`}>{t.due}</span>
                  <Avatar id={t.owner} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && tasks.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
            No tasks assigned to you
          </div>
        </div>
      )}
    </div>
  );
};
