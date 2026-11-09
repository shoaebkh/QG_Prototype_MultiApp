import salesManifest from '@multiapp/app-sales/manifest';
import serviceManifest from '@multiapp/app-service/manifest';
import analyticsManifest from '@multiapp/app-analytics/manifest';

// The full catalog this codebase *knows how to run*. Nothing here forces
// an app into the bundle by itself - only the filtered list below gets
// touched by a dynamic import() call, and that's what Vite's build
// actually puts into separate output chunks.
const ALL_APPS = [
  { manifest: salesManifest, load: () => import('@multiapp/app-sales/routes') },
  { manifest: serviceManifest, load: () => import('@multiapp/app-service/routes') },
  { manifest: analyticsManifest, load: () => import('@multiapp/app-analytics/routes') },
];

// VITE_ENABLED_APPS is read from .env / .env.<mode> at build time. Run
// `npm run build:sales-only` and the service/analytics chunks are simply
// never requested - that's the "ship a subset of apps" story.
const enabledIds = (import.meta.env.VITE_ENABLED_APPS ?? 'sales,service,analytics')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export const appRegistry = ALL_APPS.filter((app) => enabledIds.includes(app.manifest.id));
