import { useState, useEffect } from 'react';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio } from './components/UI/TweaksPanel';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Dashboard } from './pages/Dashboard';
import { AccountsView } from './pages/Accounts';
import { PipelineView } from './pages/Pipeline';
import { OpportunitiesView } from './pages/Opportunities';
import { TasksView } from './pages/Tasks';
import { AnalyticsView } from './pages/Analytics';
import { ContactsView } from './pages/Contacts';
import { LeadsView } from './pages/Leads';
import { ActivitiesView } from './pages/Activities';
import { InboxView } from './pages/Inbox';
import { MembersView } from './pages/Members';
import { BackOfficeView } from './pages/BackOffice';
import { ManagerView } from './pages/ManagerView';
import { DetailPanel } from './components/panels/DetailPanel';
import { CommandPalette } from './components/shared/CommandPalette';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { QuickAdd } from './components/panels/QuickAdd';
import { ReportsView } from './pages/Reports';
import { CustomFieldsView } from './pages/CustomFields';
import { Icon } from './components/UI/Icon';
import { api } from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import AcceptInvite from './pages/AcceptInvite';

const TWEAK_DEFAULTS = {
  density: 'default',
  accent: 'cobalt',
  theme: 'light',
  sidebar: 'expanded',
};

const ACCENT_PRESETS = {
  cobalt:   { accent: 'oklch(0.58 0.18 258)', accentHover: 'oklch(0.52 0.18 258)', accentInk: 'oklch(0.42 0.18 258)', accentSoft: 'oklch(0.95 0.04 258)' },
  emerald:  { accent: 'oklch(0.6 0.14 158)',  accentHover: 'oklch(0.54 0.14 158)', accentInk: 'oklch(0.42 0.14 158)', accentSoft: 'oklch(0.94 0.04 158)' },
  amber:    { accent: 'oklch(0.68 0.16 60)',   accentHover: 'oklch(0.62 0.16 60)',  accentInk: 'oklch(0.45 0.16 60)',  accentSoft: 'oklch(0.95 0.05 75)'  },
  rose:     { accent: 'oklch(0.6 0.18 12)',    accentHover: 'oklch(0.54 0.18 12)',  accentInk: 'oklch(0.42 0.18 12)',  accentSoft: 'oklch(0.95 0.04 12)'  },
  graphite: { accent: 'oklch(0.32 0.01 258)',  accentHover: 'oklch(0.24 0.01 258)', accentInk: 'oklch(0.22 0.01 258)', accentSoft: 'oklch(0.93 0.005 258)' },
};

// Detect public routes from the current URL (no React Router needed)
function detectPublicRoute() {
  const path   = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  if (path === '/accept-invite' || params.has('token')) {
    return { name: 'accept-invite', token: params.get('token') };
  }
  if (path === '/register') return { name: 'register' };
  return null;
}

export default function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView]    = useState('dashboard');
  const [detail, setDetail]   = useState(null);
  const [showCmd, setShowCmd] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState(null);
  const [toasts, setToasts]   = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickAddPrefill, setQuickAddPrefill] = useState({});
  const [user, setUser]       = useState(null);
  const [membersById, setMembersById] = useState({});
  const [authChecked, setAuthChecked] = useState(false);

  // Public route state (register / accept-invite) — checked once on mount
  const [publicRoute] = useState(detectPublicRoute);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setAuthChecked(true); return; }
    api.me()
      .then(u => {
        setUser(u);
        setAuthChecked(true);
        api.listMembers().then(list => {
          if (Array.isArray(list)) {
            const map = {};
            list.forEach(m => { map[m.id] = m; });
            setMembersById(map);
          }
        }).catch(() => {});
      })
      .catch(() => { localStorage.removeItem('accessToken'); setAuthChecked(true); });
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = tweaks.theme;
    const a = ACCENT_PRESETS[tweaks.accent] || ACCENT_PRESETS.cobalt;
    root.style.setProperty('--accent', a.accent);
    root.style.setProperty('--accent-hover', a.accentHover);
    root.style.setProperty('--accent-ink', a.accentInk);
    root.style.setProperty('--accent-soft', a.accentSoft);
  }, [tweaks.theme, tweaks.accent]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowCmd(true); }
      if (e.key === 'Escape') { setDetail(null); setShowCmd(false); setShowAdd(false); }
      if (!e.metaKey && !e.ctrlKey && !e.altKey &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        if (e.key === 'c') { e.preventDefault(); setShowAdd(true); }
        if (e.key === '/') { e.preventDefault(); setShowCmd(true); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const addToast = (msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400);
  };

  const handleLogin = (u) => {
    setUser(u);
    api.listMembers().then(list => {
      if (Array.isArray(list)) {
        const map = {};
        list.forEach(m => { map[m.id] = m; });
        setMembersById(map);
      }
    }).catch(() => {});
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setMembersById({});
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-sunken)', color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--font)' }}>
        Loading…
      </div>
    );
  }

  // ── Public routes (accessible without login) ─────────────────────────────
  if (!user) {
    if (publicRoute?.name === 'accept-invite') {
      return <AcceptInvite token={publicRoute.token} onLogin={handleLogin} />;
    }
    if (authView === 'register' || publicRoute?.name === 'register') {
      return <Register onLogin={handleLogin} onBack={() => setAuthView('login')} />;
    }
    return <Login onLogin={handleLogin} onRegister={() => setAuthView('register')} />;
  }

  // ── Main app ─────────────────────────────────────────────────────────────
  const renderView = () => {
    switch (view) {
      case 'dashboard':  return <Dashboard openDetail={setDetail} addToast={addToast} openQuickAdd={(t) => { setQuickAddType(t || null); setShowAdd(true); }} user={user} refreshKey={refreshKey} setView={setView} />;
      case 'accounts':   return <AccountsView openDetail={setDetail} addToast={addToast} membersById={membersById} />;
      case 'contacts':   return <ContactsView openDetail={setDetail} addToast={addToast} membersById={membersById} />;
      case 'leads':      return <LeadsView addToast={addToast} membersById={membersById} />;
      case 'opportunities': return <OpportunitiesView openDetail={setDetail} membersById={membersById} />;
      case 'pipeline':   return <PipelineView openDetail={setDetail} addToast={addToast} openQuickAdd={(t) => { setQuickAddType(t || null); setShowAdd(true); }} membersById={membersById} />;
      case 'activities': return <ActivitiesView openQuickAdd={(t) => { setQuickAddType(t || null); setShowAdd(true); }} />;
      case 'inbox':      return <InboxView addToast={addToast} />;
      case 'mytasks':    return <TasksView openDetail={setDetail} addToast={addToast} openQuickAdd={(t) => { setQuickAddType(t || null); setShowAdd(true); }} />;
      case 'analytics':  return <AnalyticsView />;
      case 'manager':    return <ManagerView addToast={addToast} />;
      case 'members':      return <MembersView addToast={addToast} user={user} />;
      case 'reports':      return <ReportsView />;
      case 'customfields': return <CustomFieldsView addToast={addToast} />;
      case 'backoffice':   return <BackOfficeView addToast={addToast} />;
      default:           return <Dashboard openDetail={setDetail} addToast={addToast} openQuickAdd={(t) => { setQuickAddType(t || null); setShowAdd(true); }} user={user} refreshKey={refreshKey} setView={setView} />;
    }
  };

  return (
    <div className="app" data-density={tweaks.density} data-sidebar={tweaks.sidebar}>
      <Sidebar
        view={view}
        setView={(v) => { setView(v); setDetail(null); }}
        openCmd={() => setShowCmd(true)}
        openQuickAdd={() => setShowAdd(true)}
        collapsed={tweaks.sidebar === 'collapsed'}
        user={user}
        onLogout={logout}
      />
      <div className="main">
        <Topbar
          view={view}
          openQuickAdd={() => setShowAdd(true)}
          openCmd={() => setShowCmd(true)}
          toggleSidebar={() => setTweak('sidebar', tweaks.sidebar === 'collapsed' ? 'expanded' : 'collapsed')}
          openDetail={setDetail}
        />
        <div className="page" key={view}>
          <ErrorBoundary key={view}>
            {renderView()}
          </ErrorBoundary>
        </div>
      </div>

      {detail && <DetailPanel item={detail} onClose={() => setDetail(null)} openQuickAdd={(t, prefill = {}) => { setQuickAddType(t || null); setQuickAddPrefill(prefill); setShowAdd(true); }} addToast={addToast} onDeleted={() => { setDetail(null); setRefreshKey(k => k + 1); }} />}
      {showCmd && <CommandPalette onClose={() => setShowCmd(false)} setView={setView} openQuickAdd={() => setShowAdd(true)} openDetail={setDetail} />}
      {showAdd && <QuickAdd onClose={() => { setShowAdd(false); setQuickAddType(null); setQuickAddPrefill({}); }} onSaved={() => setRefreshKey(k => k + 1)} addToast={addToast} initialType={quickAddType} initialPrefill={quickAddPrefill} />}

      {toasts.length > 0 && (
        <div className="toast">
          <Icon name="check-sm" size={14} stroke={2.4} style={{ color: 'var(--success)' }} />
          {toasts[toasts.length - 1].msg}
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio label="Mode" value={tweaks.theme} onChange={v => setTweak('theme', v)}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          <TweakRadio label="Accent" value={tweaks.accent} onChange={v => setTweak('accent', v)}
            options={[
              { value: 'cobalt',   label: 'Cobalt'   },
              { value: 'emerald',  label: 'Emerald'  },
              { value: 'amber',    label: 'Amber'    },
              { value: 'rose',     label: 'Rose'     },
              { value: 'graphite', label: 'Graphite' },
            ]} />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakRadio label="Density" value={tweaks.density} onChange={v => setTweak('density', v)}
            options={[{ value: 'compact', label: 'Compact' }, { value: 'default', label: 'Default' }, { value: 'cozy', label: 'Cozy' }]} />
          <TweakRadio label="Sidebar" value={tweaks.sidebar} onChange={v => setTweak('sidebar', v)}
            options={[{ value: 'expanded', label: 'Expanded' }, { value: 'collapsed', label: 'Icons only' }]} />
        </TweakSection>
        <TweakSection label="Navigate">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
            <div><kbd className="kbd-inline">⌘K</kbd> Command palette</div>
            <div><kbd className="kbd-inline">C</kbd> Quick create</div>
            <div><kbd className="kbd-inline">/</kbd> Search</div>
            <div><kbd className="kbd-inline">Esc</kbd> Close panels</div>
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}
