# @multiapp/shell

The host application. It owns routing and layout (`TopNav`, `AppLauncher`) and
dynamically loads each micro-app's routes from `src/registry.js`, based on
which app ids are listed in `VITE_ENABLED_APPS`. This lets one codebase ship
the full product or a subset of it, decided at build time.

## How app selection works

`src/registry.js` defines the full catalog (`ALL_APPS`) and filters it down
to `appRegistry` using the `VITE_ENABLED_APPS` env var (comma-separated app
ids: `sales`, `service`, `analytics`). Only ids present in that list ever
have their `load()` called, so a disabled app's code is never fetched by the
browser at runtime.

Caveat: Vite/Rollup still statically sees all three `import()` calls in
`registry.js` and emits a chunk file for each app in `dist/assets/`,
regardless of which ones are enabled — they just sit there unused and
unrequested. If you need a disabled app's code gone from the build output
entirely, removing it from `VITE_ENABLED_APPS` isn't enough; you'd also need
to remove its entry from `ALL_APPS` (and its dependency in `package.json`).

Vite loads env files in layers: `.env` (always, provides shared defaults like
the per-service API URLs) then `.env.<mode>` (mode-specific overrides, here
just `VITE_ENABLED_APPS`). `--mode <name>` selects which `.env.<name>` file
to layer on top.

Pre-defined modes already in this repo:

| File | `VITE_ENABLED_APPS` | Build command |
|---|---|---|
| `.env.all` | `sales,service,analytics` | `npm run build:all` |
| `.env.sales-service` | `sales,service` | `npm run build:sales-service` |
| `.env.sales-only` | `sales` | `npm run build:sales-only` |

## Building an arbitrary subset of apps

Use `scripts/build-apps.mjs` (wired up as the root `build:apps` script) to
build any combination without hand-writing an env file first. It discovers
valid app ids from `packages/app-*/src/manifest.js`, so it stays correct as
apps are added or removed.

From the repo root:

```bash
npm run build:apps -- sales,analytics
```

This will:
1. Validate the requested ids against the apps that actually exist in
   `packages/`.
2. Write `apps/shell/.env.<sorted-ids-joined-by-dash>` (e.g.
   `.env.analytics-sales`) with `VITE_ENABLED_APPS=<ids>`.
3. Run `vite build --mode <sorted-ids-joined-by-dash>`, producing
   `apps/shell/dist/` containing only the requested apps' functionality.

Invalid or missing app ids print the available list and exit non-zero
instead of building:

```bash
npm run build:apps -- sales,bogus
# Unknown app id(s): bogus
# Usage: build-apps.mjs <app-id>[,<app-id>...]
# Available apps: analytics, sales, service
```

The generated `.env.<mode>` files are harmless to keep around (they're cheap,
plain text, and reproducible) or delete between runs — your call.

You can also call the script directly instead of through the npm alias:

```bash
node apps/shell/scripts/build-apps.mjs sales,analytics
```

## Deploying a built subset

`npm run build:apps -- <ids>` (or any of the `build:*` scripts) produces a
static site in `apps/shell/dist/`. Deploy that directory to any static host
(nginx, S3 + CloudFront, etc.) pointed at the production URLs for whichever
backend services the enabled apps need — see `.env` for which
`VITE_<APP>_API_URL` each app reads.

### Known gap: cross-service calls

Enabling only a subset of apps on the frontend does not remove their
backend's dependency on other services. In particular:
- Sales' "Convert to Case" button calls `sales-service`, which in turn calls
  `service-service`.
- The entire Analytics app is powered by `analytics-service`'s
  `/api/analytics/summary`, which also calls `service-service`.

If you deploy a frontend subset that excludes `service`, either accept that
those two flows will fail at runtime, or keep `service-service` deployed
headlessly (not in the gateway's app catalog, not user-facing) purely so
those backend-to-backend calls succeed.
