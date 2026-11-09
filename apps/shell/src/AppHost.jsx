import { lazy, Suspense, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { appRegistry } from './registry.js';
import { useShellStore } from '@multiapp/shared-store';
import NotFound from './pages/NotFound.jsx';

export default function AppHost() {
  const { appId } = useParams();
  const entry = appRegistry.find((a) => a.manifest.id === appId);
  const setActiveApp = useShellStore((s) => s.setActiveApp);

  useEffect(() => {
    setActiveApp(entry?.manifest ?? null);
    return () => setActiveApp(null);
  }, [entry, setActiveApp]);

  // One lazy component per app, loaded on first visit and cached by the
  // browser/Vite after that - this is what makes app switching a
  // client-side route change instead of a full page reload.
  const RoutesComponent = useMemo(() => (entry ? lazy(entry.load) : null), [entry]);

  if (!entry) {
    return <NotFound appId={appId} />;
  }

  return (
    <Suspense fallback={<div className="app-loading">Loading {entry.manifest.name}…</div>}>
      <RoutesComponent />
    </Suspense>
  );
}
