import { Icon } from '../UI/Icon';
import { Avatar, KbdInline } from '../UI/Primitives';

export const Sidebar = ({ view, setView, openCmd, openQuickAdd, collapsed, user, onLogout }) => {
  const objects = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'accounts',      label: 'Accounts',      icon: 'company'  },
    { id: 'contacts',      label: 'Contacts',      icon: 'user'     },
    { id: 'leads',         label: 'Leads',         icon: 'flag'     },
    { id: 'opportunities', label: 'Opportunities', icon: 'trend'    },
    { id: 'pipeline',      label: 'Pipeline',      icon: 'pipeline' },
    { id: 'activities',    label: 'Activities',    icon: 'cal'      },
  ];
  const workflow = [
    { id: 'inbox',    label: 'Inbox',     icon: 'inbox' },
    { id: 'mytasks',  label: 'My tasks',  icon: 'check-list' },
    { id: 'analytics',label: 'Analytics', icon: 'chart' },
    { id: 'reports',  label: 'Reports',   icon: 'note' },
  ];

  const isManager    = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'super_admin';
  const isAdmin      = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User'
    : 'User';
  const displayEmail = user?.email || '';
  const avatarId = user ? (displayName[0] + (displayName.split(' ')[1]?.[0] || '')).toUpperCase() : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="workspace">
          <div className="workspace-mark">IN</div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="workspace-name">Indigo CRM</div>
              <div className="workspace-meta">workspace · {user?.role || 'user'}</div>
            </div>
          )}
          {!collapsed && <Icon name="chevron-up-down" size={13} />}
        </div>
      </div>

      {!collapsed && (
        <div className="sidebar-search" onClick={openCmd}>
          <Icon name="search" size={13} />
          <input placeholder="Search or jump to…" readOnly />
          <span className="kbd">⌘K</span>
        </div>
      )}

      <div className="nav">
        <div className="nav-section">
          {!collapsed && <div className="nav-label"><span>Workspace</span></div>}
          {objects.slice(0, 1).map(item => (
            <div key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
              <Icon name={item.icon} size={15} />
              {!collapsed && <span>{item.label}</span>}
            </div>
          ))}
        </div>

        <div className="nav-section">
          {!collapsed && (
            <div className="nav-label">
              <span>Records</span>
              <span style={{ cursor: 'pointer' }} title="New record" onClick={openQuickAdd}>
                <Icon name="plus" size={11} />
              </span>
            </div>
          )}
          {objects.slice(1).map(item => (
            <div key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
              <Icon name={item.icon} size={15} />
              {!collapsed && <span>{item.label}</span>}
            </div>
          ))}
        </div>

        <div className="nav-section">
          {!collapsed && <div className="nav-label"><span>Workflow</span></div>}
          {workflow.map(item => (
            <div key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
              <Icon name={item.icon} size={15} />
              {!collapsed && <span>{item.label}</span>}
            </div>
          ))}
        </div>

        {isManager && (
          <div className="nav-section">
            {!collapsed && <div className="nav-label"><span>Management</span></div>}
            <div className={`nav-item ${view === 'manager' ? 'active' : ''}`} onClick={() => setView('manager')}>
              <Icon name="chart" size={15} />
              {!collapsed && <span>Team metrics</span>}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="nav-section">
            {!collapsed && <div className="nav-label"><span>Settings</span></div>}
            <div className={`nav-item ${view === 'members' ? 'active' : ''}`} onClick={() => setView('members')}>
              <Icon name="users" size={15} />
              {!collapsed && <span>Members</span>}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="nav-section">
            {!collapsed && <div className="nav-label"><span>Platform</span></div>}
            <div className={`nav-item ${view === 'backoffice' ? 'active' : ''}`} onClick={() => setView('backoffice')}>
              <Icon name="gear" size={15} />
              {!collapsed && <span>Back office</span>}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-foot">
        {!collapsed ? (
          <div className="user-card" style={{ cursor: 'default' }}>
            <Avatar id={avatarId} size="md" name={displayName} />
            <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayEmail}</div>
            </div>
            <button
              title="Sign out"
              onClick={onLogout}
              className="btn ghost icon sm"
              style={{ flexShrink: 0 }}
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', padding: 4 }}>
            <Avatar id={avatarId} size="md" name={displayName} />
          </div>
        )}
      </div>
    </aside>
  );
};
