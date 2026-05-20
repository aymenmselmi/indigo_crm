import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { api, unwrap } from '../services/api';
import { normalizeActivity } from '../utils/normalize';

export const InboxView = () => {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.getActivities(20)
      .then(res => {
        const items = unwrap(res);
        if (items.length > 0) setActivity(items.map(normalizeActivity));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-inner" style={{ maxWidth: 880 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Inbox</div>
          <div className="page-sub">Mentions, replies, AI nudges · <span className="mono">{activity.length} items</span></div>
        </div>
        <div className="actions">
          <button className="btn sm">Mark all read</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body flush feed">
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
          ) : activity.slice(0, 10).map((a, i) => (
            <div className="feed-item" key={a.id} style={{ background: i < 4 ? 'var(--accent-soft)' : '' }}>
              <div className={`feed-icon ${a.icon === 'default' ? '' : a.icon}`}>
                <Icon
                  name={
                    a.kind === 'email'   ? 'mail'
                    : a.kind === 'call'  ? 'phone'
                    : a.kind === 'task'  ? 'task'
                    : a.kind === 'note'  ? 'note'
                    : 'mail'
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
          {!loading && activity.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
              No activity recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
