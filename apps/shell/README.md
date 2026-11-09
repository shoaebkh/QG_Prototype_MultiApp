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

The generated `.env.<mode>` files are gitignored (see `.gitignore` — only
the three hand-authored mode files above are tracked), so ad-hoc combos
don't clutter `git status`. They're harmless to leave on disk between runs
or delete — your call.

You can also call the script directly instead of through the npm alias:

```bash
node apps/shell/scripts/build-apps.mjs sales,analytics
```

## Versioning releases

By default, a successful build also cuts a release: `build-apps.mjs` bumps
the `version` in `apps/shell/package.json`, commits that bump, and creates
an annotated git tag `shell-v<version>` pointing at it — so you can look
back later and check out exactly the source that produced a given build.

```bash
npm run build:apps -- sales,analytics                    # patch bump: 1.0.0 -> 1.0.1
npm run build:apps -- sales,analytics --bump minor        # minor bump: 1.0.1 -> 1.1.0
npm run build:apps -- sales,analytics --bump major        # major bump: 1.1.0 -> 2.0.0
npm run build:apps -- sales,analytics --set-version 2.5.0 # set an exact version
npm run build:apps -- sales,analytics --no-release        # build only, skip bump/tag
```

Rules the release step enforces:
- **The working tree must be clean first.** If you have uncommitted changes
  (your fix/change from the "1.0 -> 1.2" scenario), the build still runs and
  `dist/` is still produced, but the bump/commit/tag is skipped with a
  message telling you to commit first, then re-run. This guarantees the tag
  always points at a commit that actually contains the change you just
  built.
- **No git repo, no release.** If the project isn't a git repo at all, the
  build runs and the release step is silently skipped (with a warning).
- **Tags are never reused.** Re-running with a version that's already
  tagged fails loudly instead of silently overwriting history — pick a
  different `--bump` level or `--set-version`.
- **Nothing is pushed automatically.** The script only commits and tags
  locally; push both yourself when ready:
  ```bash
  git push && git push --tags
  ```

The commit/tag only ever touch `apps/shell/package.json` (via a targeted
`git add`, never `git add -A`), so any unrelated staged/unstaged work you
have is left alone — it's just blocked from being released until you
commit it too.

### What the tag gives you (and what it doesn't)

The tag marks the **source commit**, not the built artifact — `dist/` is
gitignored and is never committed. If you need to retrieve or redistribute
the actual files you shipped for `shell-v1.2.0` later, either:
- rebuild from that tag (`git checkout shell-v1.2.0 && npm run build:apps -- <ids>`,
  which is fully reproducible since the tag pins the exact source), or
- keep the `dist/` zip from that build as a release asset somewhere outside
  git (GitHub Release, S3, artifact registry) at the time you built it.

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
