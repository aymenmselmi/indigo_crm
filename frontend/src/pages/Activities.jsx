import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { api, unwrap } from '../services/api';
import { normalizeActivity } from '../utils/normalize';

export const ActivitiesView = ({ openQuickAdd }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    api.getActivities(100)
      .then(res => setActivities(unwrap(res).map(normalizeActivity)))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  const ICON_NAME  = { email: 'mail', call: 'phone', meeting: 'cal', note: 'note', task: 'task' };
  const TYPE_LABEL = { email: 'Email', call: 'Call', meeting: 'Meeting', note: 'Note', task: 'Task' };

  const rows = activities.filter(a => {
    if (filter !== 'all' && a.kind !== filter) return false;
    if (search && !a.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-inner">
      <div className="page-head">
        <div>
          <div className="page-title">Activities</div>
          <div className="page-sub">Calls, emails, meetings, notes · <span className="mono">{activities.length} total</span></div>
        </div>
        <div className="actions">
          <button className="btn primary sm" onClick={() => openQuickAdd && openQuickAdd('activity')}>
            <Icon name="plus" size={13} />Log activity
          </button>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 0 }}>
        {['all', 'call', 'email', 'meeting', 'note'].map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f === 'all' ? `All (${activities.length})` : TYPE_LABEL[f]}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Icon name="search" size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search activities"
            style={{ height: 24, padding: '0 8px 0 26px', border: '1px solid var(--line)', borderRadius: 5, background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 11.5, outline: 'none', width: 200, color: 'var(--ink)' }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-body flush">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading activities…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
              {filter === 'all' ? 'No activities recorded yet.' : `No ${TYPE_LABEL[filter] || filter} activities.`}
              {filter === 'all' && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn primary sm" onClick={() => openQuickAdd && openQuickAdd('activity')}><Icon name="plus" size={13} />Log first activity</button>
                </div>
              )}
            </div>
          ) : (
            <div className="feed">
              {rows.map(a => (
                <div key={a.id} className="feed-item" style={{ padding: '10px 16px' }}>
                  <div className={`feed-icon ${a.icon === 'default' ? '' : a.icon}`}>
                    <Icon name={ICON_NAME[a.kind] || 'note'} size={12} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="feed-text" dangerouslySetInnerHTML={{ __html: a.text }} />
                    <div className="feed-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {a.meta}
                      {a.linkedLabel && (
                        <>
                          <span style={{ color: 'var(--line-strong)' }}>·</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-ink)', fontSize: 11 }}>
                            <Icon name="link" size={10} />
                            {a.linkedLabel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="tag mono" style={{ fontSize: 10.5, textTransform: 'capitalize' }}>{TYPE_LABEL[a.kind] || a.kind}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
