import { Icon } from './UI/Icon';
import { KbdInline } from './UI/Primitives';

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
        <button className="btn ghost icon" title="Notifications"><Icon name="bell" size={15} /></button>
        <button className="btn sm" onClick={openQuickAdd}>
          <Icon name="plus" size={13} /> New <KbdInline k="C" />
        </button>
      </div>
    </div>
  );
};
