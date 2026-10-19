import { useLayoutEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Button, ConfigProvider, Empty, Layout, Menu, Popover, Tooltip } from 'antd';
import {
  AuditOutlined, BellOutlined, CarOutlined, CloudUploadOutlined, DashboardOutlined, DatabaseOutlined, DownloadOutlined,
  EnvironmentOutlined, FileDoneOutlined, LineChartOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  NodeIndexOutlined, SafetyCertificateOutlined, ScheduleOutlined, SettingOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useStore } from '../mock-backend/store.js';
import { listNotifications, listReview, logoutDispatcher } from '../mock-backend/api.js';
import { usePoll } from '../shared/usePoll.js';
import { useI18n } from '../i18n/index.js';
import { PhaseBadge, usePhase } from '../demo/phase.jsx';
import { initials } from '../shared/format.js';
import { OverlayContext, useOverlayRoot } from './components/Overlay.jsx';
import { NotificationRow } from './components/Notify.jsx';
import BrandMark from './components/Brand.jsx';
import { FleetListPage, FleetTripPage } from './pages/Fleet.jsx';
import SignIn from './pages/SignIn.jsx';
import MapPage from './pages/MapPage.jsx';
import Trips from './pages/Trips.jsx';
import Deliveries from './pages/Deliveries.jsx';
import Review from './pages/Review.jsx';
import Events from './pages/Events.jsx';
import Notifications from './pages/Notifications.jsx';
import Savings from './pages/Savings.jsx';
import Planner from './pages/Planner.jsx';
import Schedule from './pages/Schedule.jsx';
import Inspections from './pages/Inspections.jsx';
import Behaviour from './pages/Behaviour.jsx';
import Eytam from './pages/Eytam.jsx';
import Exports from './pages/Exports.jsx';
import MasterData from './pages/MasterData.jsx';
import Settings from './pages/Settings.jsx';
import './console.css';

// Console pages, their menu group and the phase of the estimate they belong to.
const PAGES = [
  { key: 'map', group: 'ops', phase: 'golive', icon: <EnvironmentOutlined />, Page: MapPage },
  { key: 'trips', group: 'ops', phase: 'golive', icon: <CarOutlined />, Page: Trips },
  { key: 'deliveries', group: 'ops', phase: 'golive', icon: <FileDoneOutlined />, Page: Deliveries },
  { key: 'review', group: 'ops', phase: 'golive', icon: <AuditOutlined />, Page: Review },
  { key: 'events', group: 'ops', phase: 'golive', icon: <ThunderboltOutlined />, Page: Events },
  { key: 'notifications', group: 'ops', phase: 'golive', icon: <BellOutlined />, Page: Notifications },
  { key: 'savings', group: 'pilot', phase: 'pilot', icon: <LineChartOutlined />, Page: Savings },
  { key: 'planner', group: 'pilot', phase: 'pilot', icon: <NodeIndexOutlined />, Page: Planner },
  { key: 'schedule', group: 'pilot', phase: 'pilot', icon: <ScheduleOutlined />, Page: Schedule },
  { key: 'inspections', group: 'pilot', phase: 'pilot', icon: <SafetyCertificateOutlined />, Page: Inspections },
  { key: 'behaviour', group: 'pilot', phase: 'pilot', icon: <DashboardOutlined />, Page: Behaviour },
  { key: 'eytam', group: 'pilot', phase: 'pilot', icon: <CloudUploadOutlined />, Page: Eytam },
  { key: 'exports', group: 'admin', phase: 'golive', icon: <DownloadOutlined />, Page: Exports },
  { key: 'master-data', group: 'admin', phase: 'golive', icon: <DatabaseOutlined />, Page: MasterData },
  { key: 'settings', group: 'admin', phase: 'golive', icon: <SettingOutlined />, Page: Settings },
];
const GROUPS = ['ops', 'pilot', 'admin'];

// Denser menu and header than the demo shell; everything else inherits the app theme.
const CONSOLE_THEME = {
  components: {
    Menu: { itemHeight: 36, itemMarginBlock: 2, itemMarginInline: 6, itemPaddingInline: 10, iconMarginInlineEnd: 9, fontSize: 13, groupTitleFontSize: 11 },
    Layout: { headerHeight: 52, headerPadding: '0 12px', headerBg: '#FFFFFF', siderBg: '#FFFFFF' },
  },
};

// No "current dispatcher" endpoint in the mock API: the profile returned at sign-in is kept for the
// browser session, and the name falls back to the email after that.
const PROFILE_KEY = 'trafixct-console-profile';
const readProfile = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PROFILE_KEY));
  } catch {
    return null;
  }
};
const keepProfile = (p) => {
  try {
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify({ email: p.email, name: p.name }));
  } catch {
    /* storage blocked: the email fallback is used */
  }
};
const nameFromEmail = (email) => {
  const local = String(email || '').split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
};

export default function ConsoleApp() {
  const [root, setRoot] = useState(null);
  const [profile, setProfile] = useState(readProfile);
  const onSignedIn = (p) => {
    keepProfile(p);
    setProfile(p);
  };
  const { filter } = usePhase();
  const signedIn = useStore((s) => s.demo.consoleSignedIn);

  let body;
  if (filter === 'p1') {
    // Phase 1: the plain fleet manager web list, no sign-in (HTTP basic auth in the real page).
    body = (
      <Routes>
        <Route path="/console/fleet" element={<FleetListPage />} />
        <Route path="/console/fleet/:tripId" element={<FleetTripPage />} />
        <Route path="*" element={<Navigate to="/console/fleet" replace />} />
      </Routes>
    );
  } else if (!signedIn) {
    body = (
      <Routes>
        <Route path="/console/login" element={<SignIn onSignedIn={onSignedIn} />} />
        <Route path="*" element={<Navigate to="/console/login" replace />} />
      </Routes>
    );
  } else {
    body = <ConsoleShell email={signedIn} profile={profile} />;
  }

  return (
    <ConfigProvider theme={CONSOLE_THEME}>
      <div className="console-root" ref={setRoot}>
        <OverlayContext.Provider value={root}>{body}</OverlayContext.Provider>
      </div>
    </ConfigProvider>
  );
}

// The sider collapses when the console itself is narrow (the frame width, not the window width).
function useAutoCollapse() {
  const root = useOverlayRoot();
  const [collapsed, setCollapsed] = useState(false);
  useLayoutEffect(() => {
    if (!root) return undefined;
    let last = root.getBoundingClientRect().width < 900;
    setCollapsed(last);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const narrow = entry.contentRect.width < 900;
      if (narrow !== last) {
        last = narrow;
        setCollapsed(narrow);
      }
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [root]);
  return [collapsed, setCollapsed];
}

function ConsoleShell({ email, profile }) {
  const { t, L, dir } = useI18n();
  const { visible } = usePhase();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useAutoCollapse();
  const { data: review } = usePoll(listReview, [], 5000);
  const reviewCount = review?.length || 0;

  const pages = PAGES.filter((p) => visible(p.phase));
  const current = pages.find((p) => pathname === `/console/${p.key}` || pathname.startsWith(`/console/${p.key}/`));
  const name = profile?.email === email ? L(profile.name) : nameFromEmail(email);

  const items = useMemo(() => {
    const groups = GROUPS.map((g) => ({
      g,
      children: pages
        .filter((p) => p.group === g)
        .map((p) => ({
          key: p.key,
          icon: p.icon,
          label: (
            <span className="nav-label">
              <span className="nav-text">{t(`console.nav.${p.key}`)}</span>
              {p.key === 'review' && reviewCount ? <Badge count={reviewCount} size="small" /> : null}
              <PhaseBadge phase={p.phase} short />
            </span>
          ),
        })),
    })).filter((x) => x.children.length);
    // Collapsed, group titles would be truncated: separate the groups with dividers instead.
    if (collapsed) return groups.flatMap((x, i) => (i ? [{ type: 'divider', key: `d-${x.g}` }, ...x.children] : x.children));
    return groups.map((x) => ({ type: 'group', key: x.g, label: t(`console.group.${x.g}`), children: x.children }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, collapsed, reviewCount, pages.length]);

  const FoldIcon = (collapsed ? dir === 'ltr' : dir === 'rtl') ? MenuUnfoldOutlined : MenuFoldOutlined;

  return (
    <Layout className="console-shell" hasSider>
      <Layout.Sider className="console-sider" theme="light" width={212} collapsedWidth={60} collapsible collapsed={collapsed} trigger={null}>
        <div className="console-brand">
          <BrandMark size={26} />
          {!collapsed ? <span className="console-brand-text">{t('console.brand')}</span> : null}
        </div>
        <Menu className="console-menu" mode="inline" inlineIndent={12} items={items} selectedKeys={current ? [current.key] : []} onClick={({ key }) => navigate(`/console/${key}`)} />
      </Layout.Sider>
      <Layout className="console-main">
        <Layout.Header className="console-header">
          <Tooltip title={t(collapsed ? 'console.menu.expand' : 'console.menu.collapse')}>
            <Button type="text" icon={<FoldIcon />} onClick={() => setCollapsed(!collapsed)} />
          </Tooltip>
          <div className="console-header-title">{current ? t(`console.nav.${current.key}`) : ''}</div>
          <NotificationBell />
          <div className="console-user">
            <span className="avatar-initials xs">{initials(name)}</span>
            <span className="console-user-name">{name}</span>
          </div>
          <Tooltip title={t('console.signOut')}>
            <Button type="text" icon={<LogoutOutlined />} onClick={() => logoutDispatcher()} aria-label={t('console.signOut')} />
          </Tooltip>
        </Layout.Header>
        <Layout.Content className="console-content">
          <Routes>
            {pages.map(({ key, Page }) => (
              <Route key={key} path={`/console/${key}`} element={<Page />} />
            ))}
            <Route path="*" element={<Navigate to={`/console/${pages[0].key}`} replace />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

// Header bell: unread count and the latest five, polled every 3 s (30-60 s in the pilot).
function NotificationBell() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data } = usePoll(listNotifications, [], 3000);
  const list = data || [];
  const unread = list.filter((n) => !n.read).length;

  const goAll = () => {
    setOpen(false);
    navigate('/console/notifications');
  };
  const content = (
    <div className="bell-pop">
      {list.length ? list.slice(0, 5).map((n) => <NotificationRow key={n.id} n={n} compact onClick={goAll} />) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('console.notifications.empty')} />}
      <div className="bell-foot">
        <Button type="link" size="small" onClick={goAll}>
          {t('console.bell.viewAll')}
        </Button>
      </div>
    </div>
  );

  return (
    <Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} content={content} title={t('console.nav.notifications')} arrow={false}>
      <Badge count={unread} size="small" offset={[-4, 4]}>
        <Button type="text" icon={<BellOutlined />} aria-label={t('console.nav.notifications')} />
      </Badge>
    </Popover>
  );
}
