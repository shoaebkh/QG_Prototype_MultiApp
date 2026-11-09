import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@multiapp/ui';
import { useShellStore } from '@multiapp/shared-store';
import { eventBus } from '@multiapp/event-bus';
import AppLauncher from './AppLauncher.jsx';

export default function TopNav() {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const activeApp = useShellStore((s) => s.activeApp);
  const currentUser = useShellStore((s) => s.currentUser);

  // TopNav never unmounts (it's outside <Outlet/>), so it's a reliable
  // place for a session-lifetime counter. This is NOT the source of
  // truth for case count anymore - service-service's database is. This
  // resets on refresh on purpose: it's "conversions you've seen happen
  // this session," not "cases that exist."
  const [sessionConversions, setSessionConversions] = useState(0);

  useEffect(() => {
    return eventBus.on('lead:converted', () => setSessionConversions((n) => n + 1));
  }, []);

  return (
    <nav className="topnav">
      <button
        className="topnav__icon-btn"
        title="App Launcher"
        onClick={() => setLauncherOpen((v) => !v)}
      >
        ⠿
      </button>
      <Link to="/" className="topnav__brand" style={{ color: '#fff', textDecoration: 'none' }}>
        Multi-App Demo
      </Link>
      <span className="topnav__crumb">
        {activeApp ? <>{activeApp.icon} {activeApp.name}</> : 'Home'}
      </span>
      <span className="topnav__spacer" />
      <button className="topnav__icon-btn" title="Leads converted this session">
        🔔 <Badge tone="danger">{sessionConversions}</Badge>
      </button>
      <span className="topnav__user">{currentUser.name}</span>

      {launcherOpen && <AppLauncher onClose={() => setLauncherOpen(false)} />}
    </nav>
  );
}
